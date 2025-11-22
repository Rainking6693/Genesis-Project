#!/usr/bin/env python3
"""
Genesis Agent Fine-Tuning Data Preparation Pipeline
Prepares training data based on Agent-FLAN methodology

Three-stage approach:
1. Format Following (T-FLAN): Learn proper tool-use formatting
2. Agent Reasoning (ReAct): Learn chain-of-thought reasoning
3. Negative Samples: Prevent hallucinations

Author: Thon (Python Specialist)
Date: October 28, 2025
"""

import os
import json
import random
from typing import Dict, List, Tuple, Any
from pathlib import Path
from datetime import datetime


class GenesisFineTuningDataGenerator:
    """Generate fine-tuning datasets for Genesis agents using Agent-FLAN methodology"""

    def __init__(self, output_dir: str = "/home/genesis/genesis-rebuild/data/finetuning"):
        self.output_dir = output_dir
        self.genesis_agents = {
            "qa_agent": {
                "description": "QA and testing agent for automated quality assurance",
                "skills": ["test_generation", "bug_detection", "regression_testing", "performance_validation"],
                "tools": ["pytest", "selenium", "unittest", "coverage"],
            },
            "support_agent": {
                "description": "Customer support agent for troubleshooting and issue resolution",
                "skills": ["customer_communication", "troubleshooting", "ticket_management", "escalation"],
                "tools": ["ticketing_system", "knowledge_base", "chat", "email"],
            },
            "analyst_agent": {
                "description": "Data analyst agent for metrics analysis and visualization",
                "skills": ["data_analysis", "visualization", "report_generation", "trend_detection"],
                "tools": ["pandas", "matplotlib", "sql", "tableau"],
            },
            "legal_agent": {
                "description": "Legal compliance agent for contract review and policy validation",
                "skills": ["contract_review", "compliance_check", "policy_analysis", "risk_assessment"],
                "tools": ["document_parser", "regulation_db", "risk_analyzer", "clause_extractor"],
            },
            "content_agent": {
                "description": "Marketing content agent for copy generation and campaigns",
                "skills": ["copywriting", "seo_optimization", "campaign_planning", "social_media"],
                "tools": ["content_generator", "seo_analyzer", "social_scheduler", "email_builder"],
            },
            "security_agent": {
                "description": "Security agent for vulnerability detection and threat analysis",
                "skills": ["vulnerability_scanning", "threat_detection", "access_control", "encryption"],
                "tools": ["scanner", "firewall", "auth_system", "encryption_lib"],
            },
        }

        Path(output_dir).mkdir(parents=True, exist_ok=True)

    # ==================== STAGE 1: T-FLAN (Format Following) ====================

    def generate_tflan_examples(
        self,
        agent_name: str,
        num_examples: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Generate T-FLAN format following examples
        Teaches proper tool-use formatting without complex reasoning
        """
        agent_config = self.genesis_agents[agent_name]
        examples = []

        for i in range(num_examples):
            # Generate simple tool-use instruction
            tool = random.choice(agent_config["tools"])
            skill = random.choice(agent_config["skills"])

            instruction = f"Use {tool} to perform {skill.replace('_', ' ')}"

            # Generate properly formatted tool call
            tool_call = {
                "tool": tool,
                "action": skill,
                "parameters": self._generate_params_for_tool(tool, skill)
            }

            # T-FLAN format: Simple instruction → Tool call → Result
            example = {
                "type": "tflan",
                "agent": agent_name,
                "conversations": [
                    {
                        "role": "user",
                        "content": instruction,
                        "loss": False
                    },
                    {
                        "role": "assistant",
                        "content": f"I will use the {tool} tool to {skill.replace('_', ' ')}.\n\nTool Call: {json.dumps(tool_call, indent=2)}\n\nResult: Success",
                        "loss": True
                    }
                ]
            }

            examples.append(example)

        return examples

    def _generate_params_for_tool(self, tool: str, skill: str) -> Dict[str, Any]:
        """Generate realistic parameters for tool calls"""
        # Tool-specific parameter templates
        param_templates = {
            "pytest": {"test_file": f"test_{skill}.py", "markers": ["unit"], "verbose": True},
            "selenium": {"url": "https://example.com", "element": ".test-class", "action": "click"},
            "pandas": {"dataframe": "df", "columns": ["id", "value"], "operation": "groupby"},
            "sql": {"query": f"SELECT * FROM {skill}", "limit": 100},
            "document_parser": {"file": "contract.pdf", "extract": ["clauses", "parties"]},
            "scanner": {"target": "192.168.1.0/24", "ports": "1-1000", "protocol": "tcp"},
        }

        return param_templates.get(tool, {"action": skill, "mode": "default"})

    # ==================== STAGE 2: ReAct (Agent Reasoning) ====================

    def generate_react_examples(
        self,
        agent_name: str,
        num_examples: int = 300
    ) -> List[Dict[str, Any]]:
        """
        Generate ReAct reasoning examples
        Teaches chain-of-thought reasoning with tool use
        """
        agent_config = self.genesis_agents[agent_name]
        examples = []

        for i in range(num_examples):
            # Generate complex task requiring reasoning
            task = self._generate_complex_task(agent_name, agent_config)

            # Generate multi-step ReAct reasoning
            reasoning_steps = self._generate_reasoning_chain(agent_name, task, agent_config)

            # ReAct format: Thought → Action → Observation loop
            conversation = [{"role": "user", "content": task, "loss": False}]

            for step in reasoning_steps:
                conversation.append({
                    "role": "assistant",
                    "content": step,
                    "loss": True
                })

            example = {
                "type": "react",
                "agent": agent_name,
                "conversations": conversation
            }

            examples.append(example)

        return examples

    def _generate_complex_task(self, agent_name: str, agent_config: Dict) -> str:
        """Generate complex task requiring multi-step reasoning"""
        task_templates = {
            "qa_agent": [
                "Test the login functionality with multiple user roles and validate session persistence",
                "Perform regression testing on the payment module and identify any breaking changes",
                "Generate comprehensive test cases for the API endpoints with edge cases",
            ],
            "support_agent": [
                "A customer reports intermittent connection issues. Diagnose and provide solution.",
                "Escalate a high-priority ticket about data loss to the appropriate team",
                "Analyze recent support tickets to identify common customer pain points",
            ],
            "analyst_agent": [
                "Analyze Q4 sales data, identify trends, and generate visualizations for executive review",
                "Compare user engagement metrics across different marketing campaigns",
                "Build a dashboard showing real-time KPIs for the operations team",
            ],
            "legal_agent": [
                "Review the vendor agreement for compliance with GDPR regulations",
                "Assess contractual risks in the proposed partnership agreement",
                "Validate that updated privacy policy meets all regulatory requirements",
            ],
            "content_agent": [
                "Create a 3-month social media campaign for product launch",
                "Optimize existing blog content for SEO and user engagement",
                "Draft email sequence for customer onboarding with A/B test variants",
            ],
            "security_agent": [
                "Scan the web application for vulnerabilities and prioritize remediation",
                "Analyze authentication logs for suspicious activity patterns",
                "Implement and test role-based access control for the admin panel",
            ],
        }

        return random.choice(task_templates.get(agent_name, ["Perform agent-specific task"]))

    def _generate_reasoning_chain(
        self,
        agent_name: str,
        task: str,
        agent_config: Dict
    ) -> List[str]:
        """Generate ReAct-style reasoning chain"""
        steps = []

        # Step 1: Thought - Analyze task
        steps.append(
            f"Thought: I need to {task.lower()}. "
            f"This requires me to use my {agent_config['description']} capabilities. "
            f"Let me break this down into steps."
        )

        # Step 2: Action - Use first tool
        tool1 = agent_config["tools"][0]
        steps.append(
            f"Action: I will use {tool1} to gather initial information.\n"
            f"Tool Call: {{{{'tool': '{tool1}', 'action': 'analyze'}}}}\n"
            f"Observation: Initial analysis complete. Found relevant data."
        )

        # Step 3: Thought - Intermediate reasoning
        steps.append(
            f"Thought: Based on the initial findings, I need to perform deeper analysis. "
            f"Let me use additional tools to complete the task."
        )

        # Step 4: Action - Use second tool
        tool2 = agent_config["tools"][1] if len(agent_config["tools"]) > 1 else tool1
        steps.append(
            f"Action: Now using {tool2} for detailed processing.\n"
            f"Tool Call: {{{{'tool': '{tool2}', 'action': 'process'}}}}\n"
            f"Observation: Processing complete. Results validated."
        )

        # Step 5: Final thought and completion
        steps.append(
            f"Thought: All necessary steps completed. I can now provide the final result.\n\n"
            f"Final Answer: Task completed successfully. "
            f"All required analyses performed using {', '.join(agent_config['tools'][:2])}. "
            f"Results are ready for review."
        )

        return steps

    # ==================== STAGE 3: Negative Samples ====================

    def generate_negative_examples(
        self,
        agent_name: str,
        num_examples: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Generate negative samples to prevent hallucinations
        Teaches agents to avoid common errors:
        - Hallucinating tool outputs
        - Using non-existent tools
        - Incorrect parameter formatting
        """
        agent_config = self.genesis_agents[agent_name]
        examples = []

        hallucination_types = [
            "non_existent_tool",
            "invalid_parameters",
            "unsupported_action",
            "out_of_scope",
        ]

        for i in range(num_examples):
            hallucination_type = random.choice(hallucination_types)

            # Generate instruction with potential for hallucination
            if hallucination_type == "non_existent_tool":
                example = self._generate_nonexistent_tool_example(agent_name, agent_config)
            elif hallucination_type == "invalid_parameters":
                example = self._generate_invalid_params_example(agent_name, agent_config)
            elif hallucination_type == "unsupported_action":
                example = self._generate_unsupported_action_example(agent_name, agent_config)
            else:  # out_of_scope
                example = self._generate_out_of_scope_example(agent_name, agent_config)

            examples.append(example)

        return examples

    def _generate_nonexistent_tool_example(self, agent_name: str, agent_config: Dict) -> Dict:
        """Generate example teaching not to use non-existent tools"""
        fake_tool = "quantum_analyzer" if agent_name != "security_agent" else "blockchain_validator"

        return {
            "type": "negative",
            "agent": agent_name,
            "hallucination_type": "non_existent_tool",
            "conversations": [
                {
                    "role": "user",
                    "content": f"Use {fake_tool} to analyze the data",
                    "loss": False
                },
                {
                    "role": "assistant",
                    "content": f"I apologize, but {fake_tool} is not available in my toolkit. "
                               f"My available tools are: {', '.join(agent_config['tools'])}. "
                               f"Would you like me to use one of these instead?",
                    "loss": True
                }
            ]
        }

    def _generate_invalid_params_example(self, agent_name: str, agent_config: Dict) -> Dict:
        """Generate example teaching proper parameter validation"""
        tool = random.choice(agent_config["tools"])

        return {
            "type": "negative",
            "agent": agent_name,
            "hallucination_type": "invalid_parameters",
            "conversations": [
                {
                    "role": "user",
                    "content": f"Use {tool} with parameter 'invalid_key': 'random_value'",
                    "loss": False
                },
                {
                    "role": "assistant",
                    "content": f"I notice the parameters provided may not be valid for {tool}. "
                               f"Let me verify the correct parameter format before proceeding. "
                               f"The expected parameters for {tool} are: [list specific params]. "
                               f"Would you like me to adjust the parameters?",
                    "loss": True
                }
            ]
        }

    def _generate_unsupported_action_example(self, agent_name: str, agent_config: Dict) -> Dict:
        """Generate example for handling unsupported actions"""
        unsupported_skill = "time_travel" if agent_name != "analyst_agent" else "mind_reading"

        return {
            "type": "negative",
            "agent": agent_name,
            "hallucination_type": "unsupported_action",
            "conversations": [
                {
                    "role": "user",
                    "content": f"Perform {unsupported_skill} operation",
                    "loss": False
                },
                {
                    "role": "assistant",
                    "content": f"{unsupported_skill.replace('_', ' ').title()} is outside my capabilities. "
                               f"My skills include: {', '.join(agent_config['skills'])}. "
                               f"How can I assist you with one of these capabilities?",
                    "loss": True
                }
            ]
        }

    def _generate_out_of_scope_example(self, agent_name: str, agent_config: Dict) -> Dict:
        """Generate example for handling out-of-scope requests"""
        # Request something outside agent's domain
        out_of_scope_tasks = {
            "qa_agent": "design a marketing campaign",
            "support_agent": "write legal contracts",
            "analyst_agent": "perform security penetration testing",
            "legal_agent": "create social media content",
            "content_agent": "audit system security",
            "security_agent": "analyze financial reports",
        }

        out_of_scope_task = out_of_scope_tasks.get(agent_name, "perform unrelated task")

        return {
            "type": "negative",
            "agent": agent_name,
            "hallucination_type": "out_of_scope",
            "conversations": [
                {
                    "role": "user",
                    "content": f"Please {out_of_scope_task}",
                    "loss": False
                },
                {
                    "role": "assistant",
                    "content": f"This request is outside my specialized domain. "
                               f"I am a {agent_config['description']}. "
                               f"I recommend routing this task to the appropriate specialized agent. "
                               f"Would you like me to suggest the right agent for this task?",
                    "loss": True
                }
            ]
        }

    # ==================== Dataset Generation and Export ====================

    def generate_full_dataset(
        self,
        agent_name: str,
        tflan_count: int = 200,
        react_count: int = 300,
        negative_count: int = 100
    ) -> List[Dict[str, Any]]:
        """Generate complete training dataset for an agent"""
        print(f"\n=== Generating dataset for {agent_name} ===")

        # Generate all three types
        print(f"  Generating {tflan_count} T-FLAN examples...")
        tflan_examples = self.generate_tflan_examples(agent_name, tflan_count)

        print(f"  Generating {react_count} ReAct examples...")
        react_examples = self.generate_react_examples(agent_name, react_count)

        print(f"  Generating {negative_count} negative examples...")
        negative_examples = self.generate_negative_examples(agent_name, negative_count)

        # Combine and shuffle
        all_examples = tflan_examples + react_examples + negative_examples
        random.shuffle(all_examples)

        print(f"  Total: {len(all_examples)} examples")

        return all_examples

    def split_train_val(
        self,
        examples: List[Dict],
        train_ratio: float = 0.8
    ) -> Tuple[List[Dict], List[Dict]]:
        """Split dataset into train and validation sets"""
        random.shuffle(examples)
        split_idx = int(len(examples) * train_ratio)
        return examples[:split_idx], examples[split_idx:]

    def save_jsonl(
        self,
        examples: List[Dict],
        filepath: str
    ) -> None:
        """Save examples in JSONL format"""
        with open(filepath, "w") as f:
            for example in examples:
                f.write(json.dumps(example) + "\n")

        print(f"✓ Saved {len(examples)} examples to {filepath}")

    def generate_all_agents(self) -> None:
        """Generate datasets for all Genesis agents"""
        print("\n" + "=" * 80)
        print("GENESIS FINE-TUNING DATASET GENERATION")
        print("Based on Agent-FLAN Methodology (T-FLAN + ReAct + Negative Samples)")
        print("=" * 80)

        summary = {
            "generation_time": datetime.now().isoformat(),
            "agents": {},
            "total_examples": 0
        }

        for agent_name in self.genesis_agents.keys():
            # Generate full dataset
            all_examples = self.generate_full_dataset(
                agent_name,
                tflan_count=200,
                react_count=300,
                negative_count=100
            )

            # Split train/val
            train_examples, val_examples = self.split_train_val(all_examples)

            # Save files
            train_path = os.path.join(self.output_dir, f"{agent_name}_train.jsonl")
            val_path = os.path.join(self.output_dir, f"{agent_name}_val.jsonl")

            self.save_jsonl(train_examples, train_path)
            self.save_jsonl(val_examples, val_path)

            # Update summary
            summary["agents"][agent_name] = {
                "train_examples": len(train_examples),
                "val_examples": len(val_examples),
                "total": len(all_examples),
                "train_file": train_path,
                "val_file": val_path
            }
            summary["total_examples"] += len(all_examples)

        # Save summary
        summary_path = os.path.join(self.output_dir, "dataset_summary.json")
        with open(summary_path, "w") as f:
            json.dump(summary, f, indent=2)

        print(f"\n✓ Generated {summary['total_examples']} total examples across {len(self.genesis_agents)} agents")
        print(f"✓ Summary saved to {summary_path}")


def main():
    """Main execution"""
    generator = GenesisFineTuningDataGenerator()
    generator.generate_all_agents()


if __name__ == "__main__":
    main()
