#!/usr/bin/env python3
"""
Lambda Labs Instance Manager
Automated provisioning and management of GPU instances for SAE training.

Usage:
    python3 lambda_labs_launcher.py launch --instance-type a100 --region us-west-1
    python3 lambda_labs_launcher.py list
    python3 lambda_labs_launcher.py show <instance-id>
    python3 lambda_labs_launcher.py terminate <instance-id>
    python3 lambda_labs_launcher.py cost-estimate --hours 12 --instance-type a100

Environment Variables:
    LAMBDA_API_KEY: Your Lambda Labs API key (required)
    LAMBDA_SSH_KEY_NAME: Name of SSH key to use (default: sae-training)
"""

import os
import sys
import json
import argparse
import requests
import time
import logging
from dataclasses import dataclass
from typing import Optional, Dict, List, Any
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lambda Labs API constants
LAMBDA_API_BASE = "https://api.lambda.ai/v1"
INSTANCE_PRICING = {
    "a100": 1.29,      # A100 40GB per hour
    "a100-80gb": 1.99, # A100 80GB per hour
    "h100": 2.29,      # H100 per hour
    "rtx-6000-ada": 0.79,  # RTX 6000 Ada per hour
    "a10": 0.35        # A10 per hour
}

@dataclass
class InstanceConfig:
    """Configuration for instance launch."""
    instance_type: str = "a100"
    region: str = "us-west-1"
    name: str = "sae-pii-training"
    file_system_size: int = 100  # GB
    ssh_key_name: str = "sae-training"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instance_type_name": self.instance_type,
            "region_name": self.region,
            "name": self.name,
            "file_system_size": self.file_system_size,
        }

class LambdaLabsClient:
    """Client for Lambda Labs API."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Lambda Labs client.

        Args:
            api_key: API key (defaults to LAMBDA_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("LAMBDA_API_KEY")
        if not self.api_key:
            raise ValueError("LAMBDA_API_KEY environment variable not set")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make API request with error handling."""
        url = f"{LAMBDA_API_BASE}{endpoint}"

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"API Error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request failed: {e}")
            raise

    def list_available_instances(self) -> List[Dict[str, Any]]:
        """List available instance types and pricing."""
        logger.info("Fetching available instance types...")
        data = self._make_request("GET", "/instance-types")

        if "data" in data:
            return data["data"]
        return [data]

    def list_instances(self) -> List[Dict[str, Any]]:
        """List all user instances."""
        logger.info("Fetching user instances...")
        data = self._make_request("GET", "/instances")

        if "data" in data:
            return data["data"]
        return [data]

    def get_instance(self, instance_id: str) -> Dict[str, Any]:
        """Get details of a specific instance."""
        logger.info(f"Fetching instance {instance_id}...")
        data = self._make_request("GET", f"/instances/{instance_id}")

        if "data" in data:
            return data["data"]
        return data

    def launch_instance(self, config: InstanceConfig) -> Dict[str, Any]:
        """Launch a new instance."""
        logger.info(f"Launching {config.instance_type} instance in {config.region}...")
        data = self._make_request(
            "POST",
            "/instances",
            json=config.to_dict()
        )

        if "data" in data:
            return data["data"]
        return data

    def terminate_instance(self, instance_id: str) -> Dict[str, Any]:
        """Terminate an instance."""
        logger.info(f"Terminating instance {instance_id}...")
        data = self._make_request("DELETE", f"/instances/{instance_id}")

        if "data" in data:
            return data["data"]
        return data

    def restart_instance(self, instance_id: str) -> Dict[str, Any]:
        """Restart a stopped instance."""
        logger.info(f"Restarting instance {instance_id}...")
        data = self._make_request("POST", f"/instances/{instance_id}/restart", json={})

        if "data" in data:
            return data["data"]
        return data

def wait_for_instance_ready(client: LambdaLabsClient, instance_id: str, timeout: int = 300) -> Dict[str, Any]:
    """
    Wait for instance to be in 'running' state.

    Args:
        client: Lambda Labs client
        instance_id: Instance ID to wait for
        timeout: Maximum seconds to wait (default: 5 minutes)

    Returns:
        Instance details when ready

    Raises:
        TimeoutError: If instance doesn't start within timeout
    """
    logger.info(f"Waiting for instance {instance_id} to be ready (timeout: {timeout}s)...")

    start_time = time.time()
    while time.time() - start_time < timeout:
        instance = client.get_instance(instance_id)
        status = instance.get("status", "unknown")

        logger.info(f"Instance status: {status}")

        if status == "running":
            logger.info(f"Instance ready!")
            return instance

        time.sleep(5)

    raise TimeoutError(f"Instance {instance_id} did not start within {timeout} seconds")

def cmd_launch(args) -> None:
    """Command: Launch a new instance."""
    try:
        client = LambdaLabsClient()

        # Check availability
        logger.info("Checking instance availability...")
        available = client.list_available_instances()

        instance_type = args.instance_type.lower()
        found = False
        for inst_type in available:
            if inst_type.get("name", "").lower() == instance_type:
                logger.info(f"Found {instance_type}: ${inst_type.get('price_cents_per_hour', 0)/100:.2f}/hr")
                found = True
                break

        if not found:
            logger.warning(f"Instance type {instance_type} not currently available. Attempting launch anyway...")

        # Create instance config
        config = InstanceConfig(
            instance_type=instance_type,
            region=args.region,
            name=args.name,
            file_system_size=args.filesystem_size,
            ssh_key_name=args.ssh_key_name
        )

        # Launch instance
        result = client.launch_instance(config)
        instance_id = result.get("id")

        logger.info(f"Instance launched! ID: {instance_id}")
        logger.info(json.dumps(result, indent=2))

        if args.wait:
            logger.info("Waiting for instance to start...")
            instance = wait_for_instance_ready(client, instance_id, timeout=args.timeout)

            ip_address = instance.get("ip")
            logger.info(f"Instance is running!")
            logger.info(f"IP Address: {ip_address}")
            logger.info(f"\nConnect with:")
            logger.info(f"  ssh -i ~/.ssh/lambda_key ubuntu@{ip_address}")

    except Exception as e:
        logger.error(f"Launch failed: {e}")
        sys.exit(1)

def cmd_list(args) -> None:
    """Command: List instances."""
    try:
        client = LambdaLabsClient()
        instances = client.list_instances()

        if not instances:
            logger.info("No instances found")
            return

        logger.info(f"Found {len(instances)} instance(s):\n")

        for inst in instances:
            inst_type = inst.get("instance_type", {})
            type_name = inst_type.get("name", "unknown")
            hourly_rate = inst_type.get("price_cents_per_hour", 0) / 100

            logger.info(f"Instance: {inst.get('id')}")
            logger.info(f"  Name: {inst.get('name')}")
            logger.info(f"  Type: {type_name} (${hourly_rate:.2f}/hr)")
            logger.info(f"  Status: {inst.get('status')}")
            logger.info(f"  Region: {inst.get('region', {}).get('name', 'unknown')}")
            logger.info(f"  IP: {inst.get('ip', 'not assigned')}")
            logger.info("")

    except Exception as e:
        logger.error(f"List failed: {e}")
        sys.exit(1)

def cmd_show(args) -> None:
    """Command: Show instance details."""
    try:
        client = LambdaLabsClient()
        instance = client.get_instance(args.instance_id)

        logger.info("Instance Details:")
        logger.info(json.dumps(instance, indent=2))

    except Exception as e:
        logger.error(f"Show failed: {e}")
        sys.exit(1)

def cmd_terminate(args) -> None:
    """Command: Terminate instance."""
    try:
        client = LambdaLabsClient()

        if not args.force:
            response = input(f"Are you sure you want to terminate {args.instance_id}? (yes/no): ")
            if response.lower() != "yes":
                logger.info("Cancelled")
                return

        result = client.terminate_instance(args.instance_id)
        logger.info(f"Instance terminated!")
        logger.info(json.dumps(result, indent=2))

    except Exception as e:
        logger.error(f"Terminate failed: {e}")
        sys.exit(1)

def cmd_cost_estimate(args) -> None:
    """Command: Estimate training cost."""
    instance_type = args.instance_type.lower()
    hourly_rate = INSTANCE_PRICING.get(instance_type)

    if not hourly_rate:
        logger.error(f"Unknown instance type: {instance_type}")
        logger.info(f"Available types: {', '.join(INSTANCE_PRICING.keys())}")
        sys.exit(1)

    hours = args.hours
    cost = hourly_rate * hours

    logger.info(f"Cost Estimate for {instance_type.upper()}:")
    logger.info(f"  Hourly Rate: ${hourly_rate:.2f}")
    logger.info(f"  Training Hours: {hours}")
    logger.info(f"  Total Cost: ${cost:.2f}")
    logger.info(f"\nWith TUMIX Early Stopping (51% reduction):")
    logger.info(f"  Training Hours: {hours * 0.49:.1f}")
    logger.info(f"  Total Cost: ${cost * 0.49:.2f}")

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Lambda Labs Instance Manager for SAE Training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Launch A100 instance
  python3 lambda_labs_launcher.py launch --instance-type a100 --wait

  # List all instances
  python3 lambda_labs_launcher.py list

  # Show instance details
  python3 lambda_labs_launcher.py show <instance-id>

  # Terminate instance
  python3 lambda_labs_launcher.py terminate <instance-id>

  # Estimate training cost
  python3 lambda_labs_launcher.py cost-estimate --hours 12
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Launch command
    launch_parser = subparsers.add_parser("launch", help="Launch a new instance")
    launch_parser.add_argument(
        "--instance-type",
        default="a100",
        choices=list(INSTANCE_PRICING.keys()),
        help="Instance type to launch (default: a100)"
    )
    launch_parser.add_argument(
        "--region",
        default="us-west-1",
        help="AWS region (default: us-west-1)"
    )
    launch_parser.add_argument(
        "--name",
        default="sae-pii-training",
        help="Instance name (default: sae-pii-training)"
    )
    launch_parser.add_argument(
        "--filesystem-size",
        type=int,
        default=100,
        help="Filesystem size in GB (default: 100)"
    )
    launch_parser.add_argument(
        "--ssh-key-name",
        default="sae-training",
        help="SSH key name (default: sae-training)"
    )
    launch_parser.add_argument(
        "--wait",
        action="store_true",
        help="Wait for instance to be ready before returning"
    )
    launch_parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Timeout for waiting (seconds, default: 300)"
    )
    launch_parser.set_defaults(func=cmd_launch)

    # List command
    list_parser = subparsers.add_parser("list", help="List all instances")
    list_parser.set_defaults(func=cmd_list)

    # Show command
    show_parser = subparsers.add_parser("show", help="Show instance details")
    show_parser.add_argument("instance_id", help="Instance ID")
    show_parser.set_defaults(func=cmd_show)

    # Terminate command
    term_parser = subparsers.add_parser("terminate", help="Terminate an instance")
    term_parser.add_argument("instance_id", help="Instance ID")
    term_parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompt"
    )
    term_parser.set_defaults(func=cmd_terminate)

    # Cost estimate command
    cost_parser = subparsers.add_parser("cost-estimate", help="Estimate training cost")
    cost_parser.add_argument(
        "--instance-type",
        default="a100",
        choices=list(INSTANCE_PRICING.keys()),
        help="Instance type (default: a100)"
    )
    cost_parser.add_argument(
        "--hours",
        type=int,
        default=12,
        help="Training hours (default: 12)"
    )
    cost_parser.set_defaults(func=cmd_cost_estimate)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)

if __name__ == "__main__":
    main()
