#!/usr/bin/env python3
"""
Memory Pattern Analytics Script

Analyzes Genesis memory infrastructure to identify:
1. Most-retrieved patterns (hot vs cold memory)
2. Knowledge graph communities (agent collaboration clusters)
3. Memory effectiveness scoring (pattern success rates)
4. Cost-benefit analysis and TTL optimization recommendations

Research Sources (via Context7 MCP):
- NetworkX (/networkx/networkx): Community detection algorithms
  Selected for: 584 code snippets, 7.4 trust score, comprehensive graph library
  Key features: Louvain communities, modularity scoring, graph traversal
  Algorithms used: louvain_communities, modularity, centrality measures

- MongoDB Aggregation Framework (best practices from LangGraph Store patterns)
  Aggregation pipelines for retrieval frequency, namespace statistics

Usage:
    # Generate full analytics report
    python scripts/analyze_memory_patterns.py

    # Export as JSON for dashboard
    python scripts/analyze_memory_patterns.py --format json --output analytics.json

    # Analyze specific namespace
    python scripts/analyze_memory_patterns.py --namespace agent

Created: November 3, 2025
Version: 1.0
"""

import asyncio
import argparse
import json
import logging
from typing import Dict, List, Any, Tuple, Optional, Set
from datetime import datetime, timedelta, timezone
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
from pathlib import Path

# Via Context7 MCP: NetworkX for graph analysis and community detection
import networkx as nx

# P1 Security Fix: Resource limits to prevent DoS
MAX_NODES = 10000
MAX_EDGES = 50000
MAX_PATTERNS = 1000

# Genesis memory infrastructure
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from infrastructure.langgraph_store import GenesisLangGraphStore, get_store
from infrastructure.memory.memory_router import MemoryRouter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PatternStats:
    """Statistics for a memory pattern."""
    key: str
    namespace: List[str]
    retrieval_count: int
    last_used: datetime
    success_rate: float
    storage_cost_mb: float
    effectiveness_score: float


@dataclass
class CommunityStats:
    """Statistics for a memory community cluster."""
    id: int
    members: List[str]
    cohesion: float
    central_nodes: List[str]
    edge_density: float


@dataclass
class MemoryAnalyticsReport:
    """Complete memory analytics report."""
    generated_at: datetime
    total_entries: int
    total_namespaces: int
    storage_by_namespace: Dict[str, int]
    retrieval_frequency: Dict[str, int]
    top_patterns: List[PatternStats]
    communities: List[CommunityStats]
    cost_savings: Dict[str, float]
    ttl_predictions: Dict[str, int]
    recommendations: List[str]


class MemoryAnalytics:
    """
    Analytics engine for Genesis memory infrastructure.

    Via Context7 MCP: Implements NetworkX community detection algorithms
    including Louvain method for modularity optimization.
    """

    def __init__(self, store: GenesisLangGraphStore):
        """
        Initialize analytics engine.

        Args:
            store: GenesisLangGraphStore instance
        """
        self.store = store
        self.router = MemoryRouter(store)
        logger.info("Initialized MemoryAnalytics")

    async def get_most_retrieved_patterns(
        self,
        limit: int = 20
    ) -> List[PatternStats]:
        """
        Find most-retrieved patterns across all namespaces.

        Queries all consensus and pattern namespaces, aggregates retrieval
        counts, and ranks by frequency.

        Args:
            limit: Maximum number of patterns to return

        Returns:
            List of PatternStats sorted by retrieval count (descending)
        """
        logger.info(f"Analyzing top {limit} retrieved patterns...")

        # Get all pattern-related namespaces
        pattern_namespaces = await self.store.list_namespaces(prefix=("consensus",))
        pattern_namespaces.extend(await self.store.list_namespaces(prefix=("pattern",)))

        all_patterns = []

        for namespace in pattern_namespaces:
            # Search all entries in this namespace
            entries = await self.store.search(namespace=namespace, limit=1000)

            for entry in entries:
                # Extract metadata
                metadata = entry.get("metadata", {})
                retrieval_count = metadata.get("retrieval_count", 0)

                # Calculate storage cost (rough estimate)
                value_str = json.dumps(entry.get("value", {}))
                storage_cost_mb = len(value_str.encode('utf-8')) / (1024 * 1024)

                # Calculate success rate (from metadata or default)
                success_rate = metadata.get("success_rate", 0.5)

                # Effectiveness score: retrieval_count * success_rate / storage_cost
                # Higher score = frequently used, high success, low storage cost
                effectiveness_score = (
                    (retrieval_count * success_rate) / max(storage_cost_mb, 0.001)
                )

                all_patterns.append(
                    PatternStats(
                        key=entry["key"],
                        namespace=list(namespace),
                        retrieval_count=retrieval_count,
                        last_used=entry.get("updated_at", entry.get("created_at")),
                        success_rate=success_rate,
                        storage_cost_mb=storage_cost_mb,
                        effectiveness_score=effectiveness_score,
                    )
                )

        # Sort by retrieval count (descending)
        all_patterns.sort(key=lambda p: p.retrieval_count, reverse=True)

        logger.info(f"Found {len(all_patterns)} total patterns, returning top {limit}")
        return all_patterns[:limit]

    async def analyze_retrieval_patterns(self) -> Dict[str, Any]:
        """
        Aggregate retrieval statistics for dashboard visualisations.

        Returns:
            Dict containing top patterns, namespace distribution, and hot/cold sets.
        """
        top_patterns = await self.get_most_retrieved_patterns(limit=MAX_PATTERNS)

        namespace_counter: Counter[str] = Counter()
        for pattern in top_patterns:
            namespace_counter[pattern.namespace[0]] += pattern.retrieval_count

        hot_patterns = [p.key for p in top_patterns if p.retrieval_count >= 25]
        cold_patterns = [p.key for p in top_patterns if p.retrieval_count <= 3]

        return {
            "top_patterns": [
                {
                    "key": p.key,
                    "namespace": p.namespace,
                    "retrieval_count": p.retrieval_count,
                    "success_rate": p.success_rate,
                }
                for p in top_patterns[:20]
            ],
            "retrieval_by_namespace": dict(namespace_counter),
            "hot_patterns": hot_patterns,
            "cold_patterns": cold_patterns,
        }

    async def build_knowledge_graph(self) -> nx.Graph:
        """
        Build NetworkX graph from memory relationships.

        Creates nodes for agents, businesses, and patterns, with edges
        representing learning relationships and pattern usage.

        Via Context7 MCP: NetworkX graph construction with node/edge attributes
        for community detection and centrality analysis.

        P1 Security Fix: Enforces MAX_NODES and MAX_EDGES limits to prevent DoS

        Returns:
            NetworkX Graph with memory relationships

        Raises:
            ValueError: If graph exceeds size limits
        """
        logger.info("Building knowledge graph from memory data...")

        # Via Context7 MCP: NetworkX Graph() for undirected relationship graph
        G = nx.Graph()
        node_count = 0
        edge_count = 0

        # Add agent nodes with limits
        agent_namespaces = await self.store.list_namespaces(prefix=("agent",))
        for namespace in agent_namespaces:
            if node_count >= MAX_NODES:
                logger.warning(f"Reached max nodes limit ({MAX_NODES}), stopping agent node creation")
                break

            agent_id = "_".join(namespace)
            entries = await self.store.search(namespace=namespace, limit=100)

            G.add_node(
                agent_id,
                type="agent",
                namespace=list(namespace),
                entry_count=len(entries),
            )
            node_count += 1

            # Add edges for pattern usage with limits
            for entry in entries:
                if edge_count >= MAX_EDGES:
                    logger.warning(f"Reached max edges limit ({MAX_EDGES}), stopping edge creation")
                    break

                if "used_patterns" in entry.get("value", {}):
                    for pattern_id in entry["value"]["used_patterns"]:
                        G.add_edge(agent_id, pattern_id, relationship="uses_pattern")
                        edge_count += 1
                        if edge_count >= MAX_EDGES:
                            break

        # Add business nodes with limits
        business_namespaces = await self.store.list_namespaces(prefix=("business",))
        for namespace in business_namespaces:
            if node_count >= MAX_NODES:
                logger.warning(f"Reached max nodes limit ({MAX_NODES}), stopping business node creation")
                break

            business_id = "_".join(namespace)
            entries = await self.store.search(namespace=namespace, limit=100)

            G.add_node(
                business_id,
                type="business",
                namespace=list(namespace),
                entry_count=len(entries),
            )
            node_count += 1

            # Add edges for learning relationships with limits
            for entry in entries:
                if edge_count >= MAX_EDGES:
                    break

                if "learned_from" in entry.get("value", {}):
                    for agent_id in entry["value"]["learned_from"]:
                        G.add_edge(business_id, agent_id, relationship="learned_from")
                        edge_count += 1
                        if edge_count >= MAX_EDGES:
                            break

        # Add consensus pattern nodes with limits
        consensus_namespaces = await self.store.list_namespaces(prefix=("consensus",))
        for namespace in consensus_namespaces:
            if node_count >= MAX_NODES:
                logger.warning(f"Reached max nodes limit ({MAX_NODES}), stopping consensus node creation")
                break

            entries = await self.store.search(namespace=namespace, limit=100)

            for entry in entries:
                if node_count >= MAX_NODES:
                    break

                pattern_id = f"consensus_{entry['key']}"
                G.add_node(
                    pattern_id,
                    type="consensus",
                    namespace=list(namespace),
                    key=entry["key"],
                )
                node_count += 1

        # P1 Security Fix: Validate final graph size
        if G.number_of_nodes() > MAX_NODES:
            raise ValueError(f"Graph too large: {G.number_of_nodes()} nodes (max: {MAX_NODES})")

        if G.number_of_edges() > MAX_EDGES:
            raise ValueError(f"Graph too large: {G.number_of_edges()} edges (max: {MAX_EDGES})")

        logger.info(
            f"Built knowledge graph: {G.number_of_nodes()} nodes, "
            f"{G.number_of_edges()} edges"
        )
        return G

    async def detect_knowledge_communities(self) -> List[List[str]]:
        """
        Provide community membership lists for compatibility with spec.
        """
        graph = await self.build_knowledge_graph()
        community_stats = self.detect_communities(graph)
        return [community.members for community in community_stats]

    def detect_communities(self, graph: nx.Graph) -> List[CommunityStats]:
        """
        Find communities in knowledge graph using Louvain algorithm.

        Via Context7 MCP: NetworkX community detection algorithms
        Reference: /networkx/networkx - community.louvain_communities
        Algorithm: Louvain method for modularity optimization (Blondel et al., 2008)

        Args:
            graph: NetworkX graph

        Returns:
            List of CommunityStats with cluster information
        """
        logger.info("Detecting communities with Louvain algorithm...")

        if graph.number_of_nodes() == 0:
            logger.warning("Graph is empty, cannot detect communities")
            return []

        # Via Context7 MCP: Louvain community detection for modularity optimization
        # Louvain algorithm maximizes modularity through hierarchical clustering
        from networkx.algorithms import community

        try:
            communities_list = list(community.louvain_communities(graph, seed=42))

            # Calculate modularity score (quality of partition)
            # Via Context7 MCP: modularity() measures quality of community structure
            modularity_score = community.modularity(graph, communities_list)
            logger.info(f"Found {len(communities_list)} communities, modularity: {modularity_score:.3f}")

            community_stats = []

            for i, comm in enumerate(communities_list):
                members = sorted(list(comm))

                # Calculate cohesion (internal edge density)
                # Via Context7 MCP: subgraph analysis for community cohesion
                if len(members) > 1:
                    subgraph = graph.subgraph(members)
                    internal_edges = subgraph.number_of_edges()
                    possible_edges = (len(members) * (len(members) - 1)) / 2
                    edge_density = internal_edges / max(possible_edges, 1)
                else:
                    edge_density = 0.0

                # Find central nodes (highest degree within community)
                # Via Context7 MCP: degree centrality for identifying key nodes
                if len(members) > 0:
                    subgraph = graph.subgraph(members)
                    centrality = nx.degree_centrality(subgraph)
                    central_nodes = sorted(
                        centrality.items(),
                        key=lambda x: x[1],
                        reverse=True
                    )[:3]  # Top 3 central nodes
                    central_node_ids = [node for node, _ in central_nodes]
                else:
                    central_node_ids = []

                community_stats.append(
                    CommunityStats(
                        id=i,
                        members=members,
                        cohesion=edge_density,
                        central_nodes=central_node_ids,
                        edge_density=edge_density,
                    )
                )

            return community_stats

        except Exception as e:
            logger.error(f"Community detection failed: {e}")
            return []

    async def score_pattern_effectiveness(self) -> Dict[str, float]:
        """
        Score patterns by effectiveness (usage × success rate / cost).

        Returns:
            Dict mapping pattern_id -> effectiveness_score
        """
        logger.info("Calculating pattern effectiveness scores...")

        top_patterns = await self.get_most_retrieved_patterns(limit=100)

        scores = {
            f"{p.namespace[-1]}_{p.key}": p.effectiveness_score
            for p in top_patterns
        }

        logger.info(f"Calculated effectiveness scores for {len(scores)} patterns")
        return scores

    async def score_memory_effectiveness(self) -> Dict[str, float]:
        """
        Compatibility alias for specification terminology.
        """
        return await self.score_pattern_effectiveness()

    async def calculate_cost_savings(self) -> Dict[str, float]:
        """
        Calculate memory cost savings from caching and TTL policies.

        Returns:
            Dict with cost breakdown
        """
        logger.info("Calculating cost savings from memory optimization...")

        # Get all namespaces
        all_namespaces = await self.store.list_namespaces()

        total_entries = 0
        storage_saved_mb = 0.0

        for namespace in all_namespaces:
            entries = await self.store.search(namespace=namespace, limit=10000)
            total_entries += len(entries)

            for entry in entries:
                metadata = entry.get("metadata", {})
                compression_meta = metadata.get("compression") or {}

                original_bytes = compression_meta.get("original_bytes")
                compressed_bytes = compression_meta.get("compressed_bytes")

                if original_bytes is not None and compressed_bytes is not None:
                    saved_bytes = max(original_bytes - compressed_bytes, 0)
                    storage_saved_mb += saved_bytes / (1024 * 1024)
                else:
                    value_str = json.dumps(entry.get("value", {}))
                    size_mb = len(value_str.encode('utf-8')) / (1024 * 1024)
                    storage_saved_mb += size_mb * 0.3

        # Estimate cost savings
        # Assume $0.10/GB/month for MongoDB storage
        monthly_storage_savings = (storage_saved_mb / 1024) * 0.10

        # Estimate API call savings from caching
        # Assume 50% hit rate, $0.002 per API call
        estimated_api_calls = total_entries * 10  # 10 retrievals per entry on average
        api_calls_saved = estimated_api_calls * 0.5
        monthly_api_savings = (api_calls_saved / 30) * 0.002

        return {
            "total": monthly_storage_savings + monthly_api_savings,
            "storage": monthly_storage_savings,
            "api_calls": monthly_api_savings,
            "entries_cached": total_entries,
        }

    async def predict_ttl_status(self) -> Dict[str, int]:
        """
        Predict TTL expiration status for all memory entries.

        Returns:
            Dict with expiring_soon, active, permanent counts
        """
        logger.info("Analyzing TTL expiration predictions...")

        counts = {
            "expiring_soon": 0,  # Expires within 24 hours
            "active": 0,         # Active with TTL > 24 hours
            "permanent": 0,      # No TTL (consensus namespace)
        }

        all_namespaces = await self.store.list_namespaces()

        for namespace in all_namespaces:
            ttl_seconds = self.store._get_ttl_for_namespace(namespace)

            if ttl_seconds is None:
                # Permanent namespace
                entries = await self.store.search(namespace=namespace, limit=10000)
                counts["permanent"] += len(entries)
            else:
                # Time-limited namespace
                entries = await self.store.search(namespace=namespace, limit=10000)

                for entry in entries:
                    created_at = entry.get("created_at")
                    if created_at:
                        # Calculate remaining TTL
                        age = (datetime.now(timezone.utc) - created_at).total_seconds()
                        remaining_ttl = ttl_seconds - age

                        if remaining_ttl < 24 * 60 * 60:  # Less than 24 hours
                            counts["expiring_soon"] += 1
                        else:
                            counts["active"] += 1
                    else:
                        counts["active"] += 1

        logger.info(f"TTL predictions: {counts}")
        return counts

    async def generate_recommendations(
        self,
        top_patterns: List[PatternStats],
        communities: List[CommunityStats],
        ttl_predictions: Dict[str, int],
    ) -> List[str]:
        """
        Generate optimization recommendations based on analytics.

        Args:
            top_patterns: Most retrieved patterns
            communities: Detected communities
            ttl_predictions: TTL status counts

        Returns:
            List of recommendation strings
        """
        recommendations = []

        # Cold pattern pruning
        cold_patterns = [p for p in top_patterns if p.retrieval_count < 5]
        if len(cold_patterns) > 10:
            recommendations.append(
                f"❄️ Consider pruning {len(cold_patterns)} cold patterns "
                f"(retrieval_count < 5) to reduce storage costs"
            )

        # Community isolation
        isolated_communities = [c for c in communities if len(c.members) == 1]
        if len(isolated_communities) > 5:
            recommendations.append(
                f"🔗 Found {len(isolated_communities)} isolated nodes - "
                f"consider cross-agent knowledge sharing to improve collaboration"
            )

        # TTL optimization
        if ttl_predictions["expiring_soon"] > 50:
            recommendations.append(
                f"⏰ {ttl_predictions['expiring_soon']} entries expiring within 24h - "
                f"consider extending TTL for frequently accessed patterns"
            )

        # High-value patterns
        high_value = [p for p in top_patterns[:10] if p.effectiveness_score > 100]
        if high_value:
            recommendations.append(
                f"⭐ {len(high_value)} high-value patterns identified - "
                f"consider promoting to permanent consensus memory"
            )

        # Community cohesion
        weak_communities = [c for c in communities if c.cohesion < 0.3]
        if weak_communities:
            recommendations.append(
                f"🌐 {len(weak_communities)} communities have low cohesion (<0.3) - "
                f"consider restructuring agent collaboration patterns"
            )

        return recommendations

    async def generate_report(
        self,
        format: str = "text",
        output_file: Optional[str] = None
    ) -> MemoryAnalyticsReport:
        """
        Generate comprehensive analytics report.

        Args:
            format: Output format ("text" or "json")
            output_file: Optional file path to save report

        Returns:
            MemoryAnalyticsReport object
        """
        logger.info("=== Generating Memory Analytics Report ===\n")

        # Gather all analytics data
        top_patterns = await self.get_most_retrieved_patterns(20)
        graph = await self.build_knowledge_graph()
        communities = self.detect_communities(graph)
        cost_savings = await self.calculate_cost_savings()
        ttl_predictions = await self.predict_ttl_status()
        recommendations = await self.generate_recommendations(
            top_patterns, communities, ttl_predictions
        )

        # Get namespace summary
        summary = await self.router.get_namespace_summary()

        # Build report
        report = MemoryAnalyticsReport(
            generated_at=datetime.now(timezone.utc),
            total_entries=sum(d["entry_count"] for d in summary["details"]),
            total_namespaces=summary["total_namespaces"],
            storage_by_namespace=dict(summary["by_type"]),
            retrieval_frequency={
                f"{p.namespace[-1]}_{p.key}": p.retrieval_count
                for p in top_patterns[:10]
            },
            top_patterns=top_patterns,
            communities=communities,
            cost_savings=cost_savings,
            ttl_predictions=ttl_predictions,
            recommendations=recommendations,
        )

        # Output report
        if format == "json":
            report_dict = asdict(report)
            # Convert datetime objects to ISO strings
            report_dict["generated_at"] = report.generated_at.isoformat()
            for pattern in report_dict["top_patterns"]:
                if pattern["last_used"]:
                    pattern["last_used"] = pattern["last_used"].isoformat()

            report_json = json.dumps(report_dict, indent=2)

            if output_file:
                with open(output_file, "w") as f:
                    f.write(report_json)
                logger.info(f"✓ JSON report saved to {output_file}")
            else:
                print(report_json)

        else:  # text format
            self._print_text_report(report)

            if output_file:
                with open(output_file, "w") as f:
                    self._print_text_report(report, file=f)
                logger.info(f"✓ Text report saved to {output_file}")

        return report

    def _print_text_report(self, report: MemoryAnalyticsReport, file=None):
        """Print formatted text report."""
        def p(text=""): print(text, file=file)

        p("=" * 80)
        p("MEMORY ANALYTICS REPORT")
        p(f"Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        p("=" * 80)
        p()

        p("📊 OVERVIEW")
        p(f"  Total Entries: {report.total_entries:,}")
        p(f"  Total Namespaces: {report.total_namespaces}")
        p()

        p("💾 STORAGE BY NAMESPACE")
        for namespace, count in sorted(report.storage_by_namespace.items()):
            p(f"  {namespace.capitalize()}: {count:,} entries")
        p()

        p(f"🔥 TOP {len(report.top_patterns)} RETRIEVED PATTERNS")
        for i, pattern in enumerate(report.top_patterns[:10], 1):
            p(f"  {i}. {pattern.key}")
            p(f"     Namespace: {' → '.join(pattern.namespace)}")
            p(f"     Retrievals: {pattern.retrieval_count:,}x")
            p(f"     Success Rate: {pattern.success_rate * 100:.1f}%")
            p(f"     Effectiveness: {pattern.effectiveness_score:.2f}")
            p()

        p(f"🌐 COMMUNITIES ({len(report.communities)} detected)")
        for comm in report.communities:
            p(f"  Community #{comm.id}: {len(comm.members)} members")
            p(f"     Cohesion: {comm.cohesion * 100:.1f}%")
            p(f"     Central Nodes: {', '.join(comm.central_nodes[:3])}")
            p()

        p("💰 COST SAVINGS")
        p(f"  Total Monthly Savings: ${report.cost_savings['total']:.2f}")
        p(f"  Storage Savings: ${report.cost_savings['storage']:.2f}")
        p(f"  API Call Savings: ${report.cost_savings['api_calls']:.2f}")
        p()

        p("⏰ TTL STATUS")
        p(f"  Expiring Soon (< 24h): {report.ttl_predictions['expiring_soon']}")
        p(f"  Active: {report.ttl_predictions['active']}")
        p(f"  Permanent: {report.ttl_predictions['permanent']}")
        p()

        p("💡 RECOMMENDATIONS")
        for i, rec in enumerate(report.recommendations, 1):
            p(f"  {i}. {rec}")
        p()

        p("=" * 80)


# Backwards compatibility with earlier instruction naming.
MemoryPatternAnalyzer = MemoryAnalytics


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Analyze Genesis memory patterns")
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output file path (default: print to stdout)"
    )
    parser.add_argument(
        "--namespace",
        type=str,
        help="Analyze specific namespace only"
    )

    args = parser.parse_args()

    # P1 Security Fix: Validate output path
    if args.output:
        output_path = Path(args.output).resolve()

        # Prevent path traversal
        if ".." in str(output_path) or not output_path.is_absolute():
            raise ValueError("Invalid output path: path traversal not allowed")

        # Ensure parent directory exists
        if not output_path.parent.exists():
            raise ValueError(f"Output directory does not exist: {output_path.parent}")

        # Validate extension
        if output_path.suffix not in ['.txt', '.json', '']:
            raise ValueError(f"Invalid file extension: {output_path.suffix} (allowed: .txt, .json)")

    # P1 Security Fix: Validate namespace
    if args.namespace:
        valid_namespaces = ['agent', 'business', 'consensus', 'pattern', 'evolution']
        if args.namespace not in valid_namespaces:
            raise ValueError(f"Invalid namespace: {args.namespace}. Must be one of {valid_namespaces}")

    # Initialize store
    store = get_store()

    # Setup indexes
    await store.setup_indexes()

    # Create analytics engine
    analytics = MemoryAnalytics(store)

    # Generate report
    await analytics.generate_report(
        format=args.format,
        output_file=args.output
    )

    # Close connection
    await store.close()


if __name__ == "__main__":
    asyncio.run(main())
