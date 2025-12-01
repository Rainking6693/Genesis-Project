"""
Socratic-Zero Agent - Self-improvement through Socratic questioning.

Uses the Socratic method to help agents improve their reasoning:
- Generate probing questions
- Challenge assumptions
- Explore alternatives
- Deepen understanding

This is a zero-shot approach that doesn't require training data.
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SocraticQuestion:
    """A Socratic question and its analysis."""
    question_id: str
    question: str
    question_type: str  # clarifying, probing, assumption, implication, viewpoint
    target_aspect: str
    expected_insight: str
    priority: int = 1


@dataclass
class SocraticDialogue:
    """A complete Socratic dialogue session."""
    session_id: str
    topic: str
    questions: List[SocraticQuestion] = field(default_factory=list)
    insights_gained: List[str] = field(default_factory=list)
    assumptions_challenged: List[str] = field(default_factory=list)
    depth_score: float = 0.0


class SocraticZeroAgent:
    """
    Agent that uses Socratic questioning for self-improvement.

    Question types:
    - Clarifying: "What do you mean by...?"
    - Probing: "Why do you think that...?"
    - Assumption: "What are you assuming when...?"
    - Implication: "What would follow if...?"
    - Viewpoint: "How might someone else see...?"
    """

    def __init__(self, llm_client=None):
        """
        Initialize Socratic-Zero agent.

        Args:
            llm_client: Optional LLM client for generating questions
        """
        self.llm_client = llm_client
        self._session_counter = 0
        self._question_counter = 0
        self._dialogue_history: List[SocraticDialogue] = []

        # Question templates by type
        self._question_templates = {
            "clarifying": [
                "What exactly do you mean by '{concept}'?",
                "Can you give an example of '{concept}'?",
                "How would you define '{concept}' in this context?",
            ],
            "probing": [
                "Why do you think '{assumption}' is true?",
                "What evidence supports '{claim}'?",
                "How did you arrive at '{conclusion}'?",
            ],
            "assumption": [
                "What assumptions are you making about '{topic}'?",
                "Is it always true that '{assumption}'?",
                "What if '{assumption}' were false?",
            ],
            "implication": [
                "What would follow if '{premise}' is correct?",
                "What are the consequences of '{action}'?",
                "How would '{change}' affect the outcome?",
            ],
            "viewpoint": [
                "How might a critic view '{position}'?",
                "What would be an alternative to '{approach}'?",
                "From a different perspective, how would you see '{situation}'?",
            ],
        }

    def generate_questions(
        self,
        topic: str,
        context: Optional[Dict[str, Any]] = None,
        question_types: Optional[List[str]] = None,
        max_questions: int = 5
    ) -> SocraticDialogue:
        """
        Generate Socratic questions for a topic.

        Args:
            topic: The topic to question
            context: Additional context
            question_types: Specific question types to generate
            max_questions: Maximum number of questions

        Returns:
            SocraticDialogue with generated questions
        """
        context = context or {}
        question_types = question_types or list(self._question_templates.keys())

        self._session_counter += 1
        session_id = f"SOC-{self._session_counter:05d}"

        dialogue = SocraticDialogue(
            session_id=session_id,
            topic=topic
        )

        # Extract key concepts from topic
        concepts = self._extract_concepts(topic)

        # Generate questions for each type
        questions_generated = 0
        for qtype in question_types:
            if questions_generated >= max_questions:
                break

            for concept in concepts[:2]:  # Use top 2 concepts
                if questions_generated >= max_questions:
                    break

                question = self._generate_question(qtype, concept, context)
                dialogue.questions.append(question)
                questions_generated += 1

        # Calculate depth score
        dialogue.depth_score = self._calculate_depth(dialogue)

        logger.info(
            f"Socratic-Zero generated {len(dialogue.questions)} questions "
            f"for topic: {topic[:50]}..."
        )

        self._dialogue_history.append(dialogue)
        return dialogue

    def _extract_concepts(self, topic: str) -> List[str]:
        """Extract key concepts from a topic."""
        # Simple extraction: split by common delimiters
        words = topic.replace(",", " ").replace(".", " ").split()

        # Filter to significant words (length > 3, not common words)
        common_words = {"the", "and", "for", "with", "that", "this", "from", "have", "will"}
        concepts = [
            w for w in words
            if len(w) > 3 and w.lower() not in common_words
        ]

        # Return unique concepts, maintaining order
        seen = set()
        unique = []
        for c in concepts:
            if c.lower() not in seen:
                seen.add(c.lower())
                unique.append(c)

        return unique[:5]  # Top 5 concepts

    def _generate_question(
        self,
        question_type: str,
        concept: str,
        context: Dict[str, Any]
    ) -> SocraticQuestion:
        """Generate a single Socratic question."""
        self._question_counter += 1
        question_id = f"Q-{self._question_counter:05d}"

        templates = self._question_templates.get(question_type, [])
        if not templates:
            template = "What can you tell me about '{concept}'?"
        else:
            # Rotate through templates
            template = templates[self._question_counter % len(templates)]

        # Fill in template
        question_text = template.format(
            concept=concept,
            assumption=concept,
            claim=concept,
            conclusion=concept,
            topic=concept,
            premise=concept,
            action=concept,
            change=concept,
            position=concept,
            approach=concept,
            situation=concept
        )

        return SocraticQuestion(
            question_id=question_id,
            question=question_text,
            question_type=question_type,
            target_aspect=concept,
            expected_insight=f"Deeper understanding of {concept}",
            priority=self._get_priority(question_type)
        )

    def _get_priority(self, question_type: str) -> int:
        """Get priority for question type."""
        priorities = {
            "assumption": 1,  # Highest priority
            "probing": 2,
            "implication": 3,
            "clarifying": 4,
            "viewpoint": 5
        }
        return priorities.get(question_type, 3)

    def _calculate_depth(self, dialogue: SocraticDialogue) -> float:
        """Calculate depth score for a dialogue."""
        if not dialogue.questions:
            return 0.0

        # Score based on question type diversity and count
        types_used = set(q.question_type for q in dialogue.questions)
        diversity_score = len(types_used) / len(self._question_templates)

        # Score based on question count
        count_score = min(len(dialogue.questions) / 10, 1.0)

        return (diversity_score + count_score) / 2

    def question_and_answer(
        self,
        topic: str,
        answer_func: callable,
        max_rounds: int = 3
    ) -> Dict[str, Any]:
        """
        Conduct a Socratic Q&A session.

        Args:
            topic: Topic to explore
            answer_func: Function that answers questions
            max_rounds: Maximum Q&A rounds

        Returns:
            Dict with Q&A results and insights
        """
        results = {
            "topic": topic,
            "rounds": [],
            "total_questions": 0,
            "insights": []
        }

        current_topic = topic

        for round_num in range(max_rounds):
            # Generate questions
            dialogue = self.generate_questions(
                current_topic,
                max_questions=2
            )

            round_data = {
                "round": round_num + 1,
                "questions": [],
                "answers": []
            }

            for question in dialogue.questions:
                try:
                    answer = answer_func(question.question)
                    round_data["questions"].append(question.question)
                    round_data["answers"].append(answer)
                    results["total_questions"] += 1

                    # Extract insights from answer
                    if isinstance(answer, str) and len(answer) > 50:
                        results["insights"].append(
                            f"From Q{results['total_questions']}: {answer[:100]}..."
                        )
                except Exception as e:
                    logger.warning(f"Q&A round failed: {e}")
                    round_data["answers"].append(f"Error: {e}")

            results["rounds"].append(round_data)

            # Update topic based on last answer for next round
            if round_data["answers"]:
                current_topic = str(round_data["answers"][-1])[:200]

        return results

    def challenge_assumptions(
        self,
        statement: str,
        assumptions: Optional[List[str]] = None
    ) -> List[Dict[str, str]]:
        """
        Challenge assumptions in a statement.

        Args:
            statement: Statement to analyze
            assumptions: Pre-identified assumptions (optional)

        Returns:
            List of assumption challenges
        """
        if assumptions is None:
            # Extract potential assumptions
            assumptions = self._identify_assumptions(statement)

        challenges = []
        for assumption in assumptions:
            challenge = {
                "assumption": assumption,
                "challenge_question": f"Is it necessarily true that {assumption}?",
                "alternative": f"What if {assumption} were not the case?",
                "implication": f"If {assumption} is false, what changes?"
            }
            challenges.append(challenge)

        return challenges

    def _identify_assumptions(self, statement: str) -> List[str]:
        """Identify implicit assumptions in a statement."""
        assumptions = []

        # Look for assumption indicators
        indicators = [
            ("because", "the causal relationship"),
            ("therefore", "the logical connection"),
            ("obviously", "the self-evidence"),
            ("always", "the universal applicability"),
            ("never", "the absolute negation"),
            ("everyone", "universal participation"),
            ("should", "the normative expectation"),
        ]

        statement_lower = statement.lower()
        for indicator, assumption_type in indicators:
            if indicator in statement_lower:
                assumptions.append(assumption_type)

        if not assumptions:
            assumptions.append("the core premise of the statement")

        return assumptions

    def get_dialogue_history(self) -> List[SocraticDialogue]:
        """Get history of all dialogues."""
        return self._dialogue_history.copy()


# Module-level factory function
def get_socratic_zero(llm_client=None) -> SocraticZeroAgent:
    """Get a Socratic-Zero agent instance."""
    return SocraticZeroAgent(llm_client=llm_client)
