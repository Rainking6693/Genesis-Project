"""Event Emitter for Genesis Dashboard Integration"""
import requests
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json

logger = logging.getLogger("event_emitter")

class GenesisEventEmitter:
    """Sends events from Genesis to Dashboard API"""
    
    def __init__(self, api_url: str = "http://localhost:8001"):
        self.api_url = api_url.rstrip('/')
        self.enabled = True
        logger.info(f"EventEmitter initialized: {self.api_url}")
    
    def emit(self, event_type: str, data: Dict[str, Any], 
             business_name: Optional[str] = None,
             agent_name: Optional[str] = None,
             message: Optional[str] = None):
        """
        Send an event to the dashboard
        
        Args:
            event_type: Type of event (e.g., 'agent_started', 'deployment_complete')
            data: Event payload
            business_name: Name of business being worked on
            agent_name: Name of agent performing action
            message: Human-readable message
        """
        if not self.enabled:
            return
        
        try:
            payload = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "business_name": business_name,
                "agent_name": agent_name,
                "message": message,
                "data": data
            }
            
            response = requests.post(
                f"{self.api_url}/events",
                json=payload,
                timeout=2
            )
            
            if response.status_code != 200:
                logger.warning(f"Dashboard API returned {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.debug(f"Could not send event to dashboard: {e}")
        except Exception as e:
            logger.error(f"Event emission error: {e}")
    
    def disable(self):
        """Disable event emission"""
        self.enabled = False
        logger.info("EventEmitter disabled")
    
    def enable(self):
        """Enable event emission"""
        self.enabled = True
        logger.info("EventEmitter enabled")
