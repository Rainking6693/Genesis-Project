#!/usr/bin/env python3
"""
Knowledge Graph Generator for Obsidian Vault

Analyzes markdown files to build a knowledge graph showing:
- Document relationships (links, references)
- Tag hierarchies
- Category connections
- Cross-references

Generates Obsidian-compatible graph data and MOC (Maps of Content) files.
"""

import os
import re
import json
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import networkx as nx
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    """Represents a node in the knowledge graph"""
    id: str
    title: str
    category: str
    file_path: str
    tags: Set[str] = field(default_factory=set)
    links: List[str] = field(default_factory=list)
    backlinks: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class GraphEdge:
    """Represents an edge in the knowledge graph"""
    source: str
    target: str
    edge_type: str  # 'link', 'tag', 'category'
    weight: float = 1.0


@dataclass
class GraphStats:
    """Statistics about the knowledge graph"""
    total_nodes: int = 0
    total_edges: int = 0
    categories: Dict[str, int] = field(default_factory=dict)
    top_tags: List[Tuple[str, int]] = field(default_factory=list)
    hub_nodes: List[Tuple[str, int]] = field(default_factory=list)
    isolated_nodes: List[str] = field(default_factory=list)


class KnowledgeGraphGenerator:
    """Generates knowledge graph from Obsidian vault"""

    def __init__(self, vault_dir: str):
        """
        Initialize knowledge graph generator

        Args:
            vault_dir: Path to Obsidian vault directory
        """
        self.vault_dir = Path(vault_dir).resolve()
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []

    async def build_graph(self) -> None:
        """Build knowledge graph from vault files"""
        logger.info(f"Building knowledge graph from {self.vault_dir}")

        # Scan all markdown files
        md_files = await self._scan_vault()
        logger.info(f"Found {len(md_files)} markdown files")

        # Parse each file and create nodes
        for md_file in md_files:
            await self._parse_file(md_file)

        # Build edges from links
        await self._build_edges()

        # Calculate backlinks
        await self._calculate_backlinks()

        # Build NetworkX graph
        await self._build_networkx_graph()

        logger.info(f"Graph built: {len(self.nodes)} nodes, {len(self.edges)} edges")

    async def _scan_vault(self) -> List[Path]:
        """
        Scan vault for markdown files

        Returns:
            List of markdown file paths
        """
        md_files = []
        for dirpath, dirnames, filenames in os.walk(self.vault_dir):
            # Skip hidden directories
            dirnames[:] = [d for d in dirnames if not d.startswith('.')]

            for filename in filenames:
                if filename.endswith('.md') and not filename.startswith('.'):
                    md_files.append(Path(dirpath) / filename)

        return md_files

    async def _parse_file(self, filepath: Path) -> None:
        """
        Parse markdown file and create graph node

        Args:
            filepath: Path to markdown file
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract frontmatter
            frontmatter, body = self._extract_frontmatter(content)

            # Get node ID (filename without extension)
            node_id = filepath.stem

            # Extract title
            title = frontmatter.get('title', node_id.replace('_', ' ').replace('-', ' ').title())

            # Extract category
            category = frontmatter.get('category', 'Other')

            # Extract tags
            tags = set()
            if 'tags' in frontmatter:
                fm_tags = frontmatter['tags']
                if isinstance(fm_tags, list):
                    tags.update(fm_tags)
                elif isinstance(fm_tags, str):
                    tags.add(fm_tags)

            # Extract tags from content
            content_tags = re.findall(r'#(\w+)', body)
            tags.update(content_tags)

            # Extract links
            links = self._extract_links(body)

            # Create node
            node = GraphNode(
                id=node_id,
                title=title,
                category=category,
                file_path=str(filepath.relative_to(self.vault_dir)),
                tags=tags,
                links=links,
                metadata=frontmatter
            )

            self.nodes[node_id] = node

        except Exception as e:
            logger.error(f"Failed to parse {filepath}: {e}")

    def _extract_frontmatter(self, content: str) -> Tuple[Dict, str]:
        """
        Extract YAML frontmatter from markdown

        Args:
            content: Raw markdown content

        Returns:
            Tuple of (frontmatter dict, body content)
        """
        frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
        match = re.match(frontmatter_pattern, content, re.DOTALL)

        if match:
            try:
                import yaml
                frontmatter_yaml = match.group(1)
                body = match.group(2)
                frontmatter = yaml.safe_load(frontmatter_yaml) or {}
                return frontmatter, body
            except Exception as e:
                logger.warning(f"Failed to parse YAML frontmatter: {e}")
                return {}, content

        return {}, content

    def _extract_links(self, content: str) -> List[str]:
        """
        Extract links from markdown content

        Args:
            content: Markdown content

        Returns:
            List of link targets (node IDs)
        """
        links = []

        # Wikilinks: [[link]] or [[link|text]]
        wikilinks = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', content)
        links.extend(wikilinks)

        # Standard markdown links to .md files: [text](file.md)
        md_links = re.findall(r'\[([^\]]+)\]\(([^)]+\.md)\)', content)
        for text, url in md_links:
            # Extract filename without extension
            link_target = Path(url).stem
            links.append(link_target)

        return links

    async def _build_edges(self) -> None:
        """Build edges from node links"""
        for node_id, node in self.nodes.items():
            # Link edges
            for link_target in node.links:
                # Normalize link target
                normalized_target = self._normalize_link(link_target)

                # Check if target exists
                if normalized_target in self.nodes:
                    edge = GraphEdge(
                        source=node_id,
                        target=normalized_target,
                        edge_type='link',
                        weight=1.0
                    )
                    self.edges.append(edge)
                else:
                    logger.debug(f"Broken link: {node_id} -> {link_target}")

            # Tag edges (connect nodes with same tags)
            for tag in node.tags:
                for other_id, other_node in self.nodes.items():
                    if other_id != node_id and tag in other_node.tags:
                        edge = GraphEdge(
                            source=node_id,
                            target=other_id,
                            edge_type='tag',
                            weight=0.5  # Lower weight for tag connections
                        )
                        self.edges.append(edge)

    def _normalize_link(self, link: str) -> str:
        """
        Normalize link target to match node ID

        Args:
            link: Raw link target

        Returns:
            Normalized node ID
        """
        # Remove .md extension if present
        if link.endswith('.md'):
            link = link[:-3]

        # Remove path components (keep only filename)
        link = Path(link).name

        return link

    async def _calculate_backlinks(self) -> None:
        """Calculate backlinks for each node"""
        for edge in self.edges:
            if edge.edge_type == 'link':
                target_node = self.nodes.get(edge.target)
                if target_node:
                    target_node.backlinks.append(edge.source)

    async def _build_networkx_graph(self) -> None:
        """Build NetworkX graph for analysis"""
        # Add nodes
        for node_id, node in self.nodes.items():
            self.graph.add_node(
                node_id,
                title=node.title,
                category=node.category,
                tags=list(node.tags)
            )

        # Add edges
        for edge in self.edges:
            if edge.edge_type == 'link':  # Only add direct links to graph
                self.graph.add_edge(
                    edge.source,
                    edge.target,
                    weight=edge.weight,
                    edge_type=edge.edge_type
                )

    async def generate_stats(self) -> GraphStats:
        """
        Generate statistics about the knowledge graph

        Returns:
            GraphStats object
        """
        stats = GraphStats()

        stats.total_nodes = len(self.nodes)
        stats.total_edges = len([e for e in self.edges if e.edge_type == 'link'])

        # Category distribution
        for node in self.nodes.values():
            if node.category not in stats.categories:
                stats.categories[node.category] = 0
            stats.categories[node.category] += 1

        # Top tags
        tag_counts = defaultdict(int)
        for node in self.nodes.values():
            for tag in node.tags:
                tag_counts[tag] += 1

        stats.top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        # Hub nodes (most connections)
        node_degrees = {}
        for node_id, node in self.nodes.items():
            total_connections = len(node.links) + len(node.backlinks)
            node_degrees[node_id] = total_connections

        stats.hub_nodes = sorted(node_degrees.items(), key=lambda x: x[1], reverse=True)[:10]

        # Isolated nodes (no connections)
        stats.isolated_nodes = [
            node_id for node_id, degree in node_degrees.items() if degree == 0
        ]

        return stats

    async def export_graph_data(self, output_path: Path) -> None:
        """
        Export graph data to JSON format

        Args:
            output_path: Path to output JSON file
        """
        graph_data = {
            'nodes': [
                {
                    'id': node.id,
                    'title': node.title,
                    'category': node.category,
                    'file_path': node.file_path,
                    'tags': list(node.tags),
                    'links': node.links,
                    'backlinks': node.backlinks
                }
                for node in self.nodes.values()
            ],
            'edges': [
                {
                    'source': edge.source,
                    'target': edge.target,
                    'type': edge.edge_type,
                    'weight': edge.weight
                }
                for edge in self.edges
            ],
            'metadata': {
                'generated': datetime.now().isoformat(),
                'vault_path': str(self.vault_dir),
                'total_nodes': len(self.nodes),
                'total_edges': len(self.edges)
            }
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, indent=2)

        logger.info(f"Graph data exported to {output_path}")

    async def generate_moc_files(self, output_dir: Path) -> None:
        """
        Generate Maps of Content (MOC) files

        Args:
            output_dir: Directory to write MOC files
        """
        logger.info("Generating Maps of Content")

        # Generate overall MOC
        await self._generate_main_moc(output_dir)

        # Generate category MOCs
        await self._generate_category_mocs(output_dir)

        # Generate tag MOCs
        await self._generate_tag_mocs(output_dir)

    async def _generate_main_moc(self, output_dir: Path) -> None:
        """Generate main MOC file"""
        stats = await self.generate_stats()

        content = f"""---
title: Genesis Knowledge Base - Main Index
tags: [moc, index]
generated: {datetime.now().isoformat()}
---

# Genesis Knowledge Base

Welcome to the Genesis project knowledge base. This vault contains comprehensive documentation for the multi-agent AI system.

## Statistics

- **Total Documents**: {stats.total_nodes}
- **Total Links**: {stats.total_edges}
- **Categories**: {len(stats.categories)}

## Categories

"""

        for category, count in sorted(stats.categories.items()):
            content += f"- [[{category}/INDEX|{category}]] ({count} documents)\n"

        content += "\n## Top Tags\n\n"
        for tag, count in stats.top_tags:
            content += f"- #{tag} ({count} documents)\n"

        content += "\n## Hub Documents (Most Connected)\n\n"
        for node_id, connections in stats.hub_nodes:
            node = self.nodes[node_id]
            content += f"- [[{node_id}|{node.title}]] ({connections} connections)\n"

        if stats.isolated_nodes:
            content += f"\n## Isolated Documents\n\n"
            content += f"These {len(stats.isolated_nodes)} documents have no connections:\n\n"
            for node_id in stats.isolated_nodes[:10]:
                node = self.nodes[node_id]
                content += f"- [[{node_id}|{node.title}]]\n"
            if len(stats.isolated_nodes) > 10:
                content += f"\n*... and {len(stats.isolated_nodes) - 10} more*\n"

        # Write file
        moc_path = output_dir / 'MOC_Main.md'
        with open(moc_path, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"Generated main MOC: {moc_path}")

    async def _generate_category_mocs(self, output_dir: Path) -> None:
        """Generate MOC files for each category"""
        categories = defaultdict(list)

        for node in self.nodes.values():
            categories[node.category].append(node)

        for category, nodes in categories.items():
            # Sort by title
            nodes.sort(key=lambda n: n.title)

            content = f"""---
title: {category} - Map of Content
category: {category}
tags: [moc, {category.lower()}]
generated: {datetime.now().isoformat()}
---

# {category} Map of Content

This section contains {len(nodes)} documents related to {category.lower()}.

## Documents

"""

            for node in nodes:
                content += f"- [[{node.id}|{node.title}]]\n"
                if node.tags:
                    tag_str = ', '.join(f'#{tag}' for tag in sorted(node.tags))
                    content += f"  *Tags: {tag_str}*\n"

            # Write file
            moc_path = output_dir / category / 'MOC.md'
            moc_path.parent.mkdir(parents=True, exist_ok=True)

            with open(moc_path, 'w', encoding='utf-8') as f:
                f.write(content)

            logger.info(f"Generated {category} MOC")

    async def _generate_tag_mocs(self, output_dir: Path) -> None:
        """Generate MOC files for top tags"""
        # Group nodes by tag
        tag_nodes = defaultdict(list)

        for node in self.nodes.values():
            for tag in node.tags:
                tag_nodes[tag].append(node)

        # Sort by frequency
        sorted_tags = sorted(tag_nodes.items(), key=lambda x: len(x[1]), reverse=True)

        # Generate MOC for top 20 tags
        moc_dir = output_dir / 'MOCs'
        moc_dir.mkdir(parents=True, exist_ok=True)

        for tag, nodes in sorted_tags[:20]:
            content = f"""---
title: "Tag: {tag}"
tags: [moc, tag-index, {tag}]
generated: {datetime.now().isoformat()}
---

# Tag: #{tag}

Documents tagged with #{tag} ({len(nodes)} total):

## Documents

"""

            # Sort by category
            nodes.sort(key=lambda n: (n.category, n.title))

            current_category = None
            for node in nodes:
                if node.category != current_category:
                    current_category = node.category
                    content += f"\n### {current_category}\n\n"

                content += f"- [[{node.id}|{node.title}]]\n"

            # Write file
            moc_path = moc_dir / f'MOC_Tag_{tag}.md'
            with open(moc_path, 'w', encoding='utf-8') as f:
                f.write(content)

        logger.info(f"Generated {min(20, len(sorted_tags))} tag MOCs")


async def main():
    """Main entry point"""
    import sys

    vault_dir = sys.argv[1] if len(sys.argv) > 1 else "/home/genesis/genesis-rebuild/obsidian_vault"

    # Create generator
    generator = KnowledgeGraphGenerator(vault_dir)

    # Build graph
    await generator.build_graph()

    # Generate statistics
    stats = await generator.generate_stats()

    # Print statistics
    print("\n" + "=" * 80)
    print("KNOWLEDGE GRAPH STATISTICS")
    print("=" * 80)
    print(f"Total Nodes: {stats.total_nodes}")
    print(f"Total Edges: {stats.total_edges}")
    print()
    print("Categories:")
    for category, count in sorted(stats.categories.items()):
        print(f"  {category}: {count} nodes")
    print()
    print("Top Tags:")
    for tag, count in stats.top_tags:
        print(f"  #{tag}: {count} nodes")
    print()
    print("Hub Nodes (Most Connected):")
    for node_id, connections in stats.hub_nodes:
        node = generator.nodes[node_id]
        print(f"  {node.title}: {connections} connections")
    print()
    print(f"Isolated Nodes: {len(stats.isolated_nodes)}")
    print("=" * 80)

    # Export graph data
    output_dir = Path(vault_dir)
    await generator.export_graph_data(output_dir / 'graph_data.json')

    # Generate MOC files
    await generator.generate_moc_files(output_dir)

    print(f"\nGraph data exported to {output_dir / 'graph_data.json'}")
    print(f"MOC files generated in {output_dir}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
