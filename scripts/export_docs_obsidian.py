#!/usr/bin/env python3
"""
Obsidian Documentation Export System

Exports Genesis project documentation to Obsidian Publish-compatible vault structure.
Scans markdown files, categorizes them, transforms links, and generates a knowledge base.

Features:
- Automatic categorization (Architecture, Research, Guides, Reports, API, Testing)
- Link transformation (relative → absolute for Obsidian)
- Frontmatter extraction and standardization
- Image/diagram copying with path rewriting
- Graph relationship preservation
- Public/internal filtering
"""

import os
import re
import shutil
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import yaml
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class MarkdownFile:
    """Represents a markdown file with metadata"""
    source_path: str
    relative_path: str
    category: str
    title: str
    frontmatter: Dict
    content: str
    links: List[str] = field(default_factory=list)
    tags: Set[str] = field(default_factory=set)
    is_public: bool = True


@dataclass
class ExportReport:
    """Export operation results"""
    total_files_scanned: int = 0
    files_exported: int = 0
    files_skipped: int = 0
    links_transformed: int = 0
    images_copied: int = 0
    categories: Dict[str, int] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class ObsidianExporter:
    """Main exporter class for Obsidian Publish vault generation"""

    def __init__(self, source_dir: str, output_dir: str):
        """
        Initialize the Obsidian exporter

        Args:
            source_dir: Root directory of Genesis project
            output_dir: Output directory for Obsidian vault
        """
        self.source_dir = Path(source_dir).resolve()
        self.output_dir = Path(output_dir).resolve()
        self.report = ExportReport()

        # Directories to exclude from scanning
        self.exclude_dirs = {
            'node_modules', '.venv', 'venv', '.git',
            'obsidian_vault', '__pycache__', '.pytest_cache',
            'build', 'dist', '.mypy_cache'
        }

        # Public categories to export
        self.public_categories = {
            'Core', 'Architecture', 'Research', 'Guides',
            'Reports', 'Testing', 'Planning', 'API'
        }

        # Internal categories to exclude
        self.internal_categories = {'Internal', 'Other'}

        # Image extensions to copy
        self.image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}

        # File cache for link resolution
        self.file_cache: Dict[str, MarkdownFile] = {}

    async def scan_documentation(self) -> List[MarkdownFile]:
        """
        Scan all markdown files and categorize them

        Returns:
            List of MarkdownFile objects
        """
        logger.info(f"Scanning documentation in {self.source_dir}")
        md_files = []

        for dirpath, dirnames, filenames in os.walk(self.source_dir):
            # Filter out excluded directories
            dirnames[:] = [d for d in dirnames if d not in self.exclude_dirs]

            for filename in filenames:
                if filename.endswith('.md'):
                    full_path = Path(dirpath) / filename
                    try:
                        md_file = await self._parse_markdown_file(full_path)
                        if md_file:
                            md_files.append(md_file)
                            self.file_cache[md_file.relative_path] = md_file
                            self.report.total_files_scanned += 1
                    except Exception as e:
                        error_msg = f"Error parsing {full_path}: {e}"
                        logger.error(error_msg)
                        self.report.errors.append(error_msg)

        logger.info(f"Scanned {len(md_files)} markdown files")
        return md_files

    async def _parse_markdown_file(self, filepath: Path) -> Optional[MarkdownFile]:
        """
        Parse a markdown file and extract metadata

        Args:
            filepath: Path to markdown file

        Returns:
            MarkdownFile object or None if parsing fails
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract frontmatter
            frontmatter, body = self._extract_frontmatter(content)

            # Determine relative path
            rel_path = str(filepath.relative_to(self.source_dir))

            # Categorize file
            category = self._categorize_file(filepath, frontmatter)

            # Determine if public
            is_public = category in self.public_categories

            # Extract title
            title = self._extract_title(filepath, frontmatter, body)

            # Extract links
            links = self._extract_links(body)

            # Extract tags
            tags = self._extract_tags(frontmatter, body)

            return MarkdownFile(
                source_path=str(filepath),
                relative_path=rel_path,
                category=category,
                title=title,
                frontmatter=frontmatter,
                content=content,
                links=links,
                tags=tags,
                is_public=is_public
            )

        except Exception as e:
            logger.error(f"Failed to parse {filepath}: {e}")
            return None

    def _extract_frontmatter(self, content: str) -> Tuple[Dict, str]:
        """
        Extract YAML frontmatter from markdown content

        Args:
            content: Raw markdown content

        Returns:
            Tuple of (frontmatter dict, body content)
        """
        frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
        match = re.match(frontmatter_pattern, content, re.DOTALL)

        if match:
            try:
                frontmatter_yaml = match.group(1)
                body = match.group(2)
                frontmatter = yaml.safe_load(frontmatter_yaml) or {}
                return frontmatter, body
            except yaml.YAMLError as e:
                logger.warning(f"Failed to parse YAML frontmatter: {e}")
                return {}, content

        return {}, content

    def _categorize_file(self, filepath: Path, frontmatter: Dict) -> str:
        """
        Categorize markdown file based on path and metadata

        Args:
            filepath: Path to file
            frontmatter: Frontmatter metadata

        Returns:
            Category string
        """
        path_str = str(filepath).lower()
        rel_path = str(filepath.relative_to(self.source_dir))

        # Check frontmatter for explicit category
        if 'category' in frontmatter:
            return frontmatter['category']

        # Category mapping based on path patterns
        if '/docs/' in path_str:
            if any(kw in path_str for kw in ['architecture', 'design', 'implementation_guide', 'integration']):
                return 'Architecture'
            elif any(kw in path_str for kw in ['report', 'summary', 'completion', 'audit', 'validation']):
                return 'Reports'
            elif any(kw in path_str for kw in ['guide', 'how', 'setup', 'deployment', 'configuration']):
                return 'Guides'
            elif any(kw in path_str for kw in ['test', 'benchmark']):
                return 'Testing'
            elif any(kw in path_str for kw in ['research', 'paper', 'arxiv', 'deep_research']):
                return 'Research'
            elif any(kw in path_str for kw in ['api', 'reference']):
                return 'API'
            else:
                return 'Architecture'

        # Root level files
        elif rel_path.count('/') == 0 or rel_path.count('/') == 1:
            if any(kw in path_str for kw in ['project_status', 'claude', 'readme', 'agent_project_mapping']):
                return 'Core'
            elif any(kw in path_str for kw in ['phase', 'rollout', 'deployment', 'complete']):
                return 'Reports'
            elif any(kw in path_str for kw in ['roadmap', 'timeline', 'plan']):
                return 'Planning'
            else:
                return 'Reports'

        # Agent definitions (internal)
        elif '/.claude/agents/' in path_str:
            return 'Internal'

        # Test documentation
        elif '/tests/' in path_str:
            return 'Testing'

        # Reports directory
        elif '/reports/' in path_str:
            return 'Reports'

        return 'Other'

    def _extract_title(self, filepath: Path, frontmatter: Dict, body: str) -> str:
        """
        Extract title from frontmatter or first heading

        Args:
            filepath: Path to file
            frontmatter: Frontmatter metadata
            body: Markdown body content

        Returns:
            Title string
        """
        # Check frontmatter
        if 'title' in frontmatter:
            return frontmatter['title']

        # Check for first H1 heading
        h1_match = re.search(r'^#\s+(.+)$', body, re.MULTILINE)
        if h1_match:
            return h1_match.group(1).strip()

        # Fall back to filename
        return filepath.stem.replace('_', ' ').replace('-', ' ').title()

    def _extract_links(self, content: str) -> List[str]:
        """
        Extract all markdown links from content

        Args:
            content: Markdown content

        Returns:
            List of link targets
        """
        links = []

        # Standard markdown links: [text](url)
        md_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        links.extend([url for text, url in md_links])

        # Wikilinks: [[link]]
        wikilinks = re.findall(r'\[\[([^\]]+)\]\]', content)
        links.extend(wikilinks)

        return links

    def _extract_tags(self, frontmatter: Dict, content: str) -> Set[str]:
        """
        Extract tags from frontmatter and content

        Args:
            frontmatter: Frontmatter metadata
            content: Markdown content

        Returns:
            Set of tags
        """
        tags = set()

        # From frontmatter
        if 'tags' in frontmatter:
            fm_tags = frontmatter['tags']
            if isinstance(fm_tags, list):
                tags.update(fm_tags)
            elif isinstance(fm_tags, str):
                tags.add(fm_tags)

        # From content (#tag format)
        content_tags = re.findall(r'#(\w+)', content)
        tags.update(content_tags)

        return tags

    async def transform_markdown(self, md_file: MarkdownFile) -> str:
        """
        Transform markdown content for Obsidian Publish

        Args:
            md_file: MarkdownFile object

        Returns:
            Transformed markdown content
        """
        # Build frontmatter
        frontmatter = {
            'title': md_file.title,
            'category': md_file.category,
            'dg-publish': True,
            'publish': True,
            'tags': list(md_file.tags) if md_file.tags else [],
            'source': md_file.relative_path,
            'exported': datetime.now().isoformat()
        }

        # Preserve original frontmatter fields
        for key, value in md_file.frontmatter.items():
            if key not in frontmatter:
                frontmatter[key] = value

        # Extract body (without original frontmatter)
        _, body = self._extract_frontmatter(md_file.content)

        # Transform links
        transformed_body = await self._transform_links(body, md_file)

        # Transform image paths
        transformed_body = await self._transform_images(transformed_body, md_file)

        # Build final content
        frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
        final_content = f"---\n{frontmatter_yaml}---\n\n{transformed_body}"

        return final_content

    async def _transform_links(self, content: str, md_file: MarkdownFile) -> str:
        """
        Transform relative links to Obsidian wikilinks

        Args:
            content: Markdown content
            md_file: Source MarkdownFile object

        Returns:
            Content with transformed links
        """
        def replace_link(match):
            text = match.group(1)
            url = match.group(2)

            # Skip external links
            if url.startswith('http://') or url.startswith('https://'):
                return match.group(0)

            # Skip anchors
            if url.startswith('#'):
                return match.group(0)

            # Transform relative markdown links to wikilinks
            if url.endswith('.md'):
                # Extract filename without extension
                link_target = Path(url).stem
                # Replace with wikilink
                self.report.links_transformed += 1
                return f"[[{link_target}|{text}]]"

            return match.group(0)

        # Transform markdown links
        transformed = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', replace_link, content)

        return transformed

    async def _transform_images(self, content: str, md_file: MarkdownFile) -> str:
        """
        Transform image paths and copy images to vault

        Args:
            content: Markdown content
            md_file: Source MarkdownFile object

        Returns:
            Content with transformed image paths
        """
        def replace_image(match):
            alt_text = match.group(1)
            img_path = match.group(2)

            # Skip external images
            if img_path.startswith('http://') or img_path.startswith('https://'):
                return match.group(0)

            # Resolve image path relative to source file
            source_dir = Path(md_file.source_path).parent
            img_file = source_dir / img_path

            if img_file.exists():
                # Copy image to attachments directory
                dest_path = self._copy_image(img_file)
                if dest_path:
                    self.report.images_copied += 1
                    # Return transformed path
                    return f"![{alt_text}]({dest_path})"
            else:
                warning = f"Image not found: {img_path} (referenced in {md_file.relative_path})"
                logger.warning(warning)
                self.report.warnings.append(warning)

            return match.group(0)

        # Transform image references
        transformed = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', replace_image, content)

        return transformed

    def _copy_image(self, image_path: Path) -> Optional[str]:
        """
        Copy image to vault attachments directory

        Args:
            image_path: Source image path

        Returns:
            Relative path in vault or None if copy fails
        """
        try:
            # Create attachments directory
            attachments_dir = self.output_dir / '_attachments'
            attachments_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename using hash to avoid collisions
            file_hash = hashlib.md5(str(image_path).encode()).hexdigest()[:8]
            dest_filename = f"{image_path.stem}_{file_hash}{image_path.suffix}"
            dest_path = attachments_dir / dest_filename

            # Copy file
            shutil.copy2(image_path, dest_path)

            # Return relative path for markdown
            return f"_attachments/{dest_filename}"

        except Exception as e:
            logger.error(f"Failed to copy image {image_path}: {e}")
            return None

    async def export_to_obsidian(self) -> ExportReport:
        """
        Main export workflow

        Returns:
            ExportReport with results
        """
        logger.info("Starting Obsidian export process")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Scan all documentation
        md_files = await self.scan_documentation()

        # Filter public files only
        public_files = [f for f in md_files if f.is_public]
        logger.info(f"Found {len(public_files)} public files to export")

        # Export each file
        for md_file in public_files:
            try:
                # Transform content
                transformed_content = await self.transform_markdown(md_file)

                # Determine output path
                output_path = self._get_output_path(md_file)

                # Create directory
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Write file
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(transformed_content)

                self.report.files_exported += 1

                # Track category stats
                if md_file.category not in self.report.categories:
                    self.report.categories[md_file.category] = 0
                self.report.categories[md_file.category] += 1

            except Exception as e:
                error_msg = f"Failed to export {md_file.relative_path}: {e}"
                logger.error(error_msg)
                self.report.errors.append(error_msg)
                self.report.files_skipped += 1

        logger.info(f"Export complete: {self.report.files_exported} files exported")

        return self.report

    def _get_output_path(self, md_file: MarkdownFile) -> Path:
        """
        Determine output path for a markdown file

        Args:
            md_file: MarkdownFile object

        Returns:
            Output path in vault
        """
        # Organize by category
        category_dir = self.output_dir / md_file.category

        # Use original filename
        filename = Path(md_file.source_path).name

        return category_dir / filename

    async def generate_index_pages(self) -> None:
        """Generate index pages for each category"""
        logger.info("Generating index pages")

        for category in self.public_categories:
            if category not in self.report.categories:
                continue

            # Collect files in this category
            category_files = [
                f for f in self.file_cache.values()
                if f.category == category and f.is_public
            ]

            # Sort by title
            category_files.sort(key=lambda f: f.title)

            # Build index content
            index_content = self._build_index_content(category, category_files)

            # Write index file
            index_path = self.output_dir / category / 'INDEX.md'
            index_path.parent.mkdir(parents=True, exist_ok=True)

            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(index_content)

            logger.info(f"Generated index for {category}")

    def _build_index_content(self, category: str, files: List[MarkdownFile]) -> str:
        """
        Build index page content for a category

        Args:
            category: Category name
            files: List of MarkdownFile objects in category

        Returns:
            Markdown content for index page
        """
        frontmatter = {
            'title': f"{category} Index",
            'category': category,
            'dg-publish': True,
            'publish': True,
            'tags': ['index', category.lower()],
            'generated': datetime.now().isoformat()
        }

        frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)

        content = f"""---
{frontmatter_yaml}---

# {category} Documentation

This section contains {len(files)} documents related to {category.lower()}.

## Contents

"""

        for md_file in files:
            # Use wikilink for Obsidian
            filename = Path(md_file.source_path).stem
            content += f"- [[{filename}|{md_file.title}]]\n"

            # Add description if available
            if 'description' in md_file.frontmatter:
                content += f"  *{md_file.frontmatter['description']}*\n"

        return content


async def main():
    """Main entry point"""
    import sys

    # Get paths from args or use defaults
    source_dir = sys.argv[1] if len(sys.argv) > 1 else "/home/genesis/genesis-rebuild"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/home/genesis/genesis-rebuild/obsidian_vault"

    # Create exporter
    exporter = ObsidianExporter(source_dir, output_dir)

    # Run export
    report = await exporter.export_to_obsidian()

    # Generate index pages
    await exporter.generate_index_pages()

    # Print report
    print("\n" + "=" * 80)
    print("OBSIDIAN EXPORT REPORT")
    print("=" * 80)
    print(f"Total files scanned: {report.total_files_scanned}")
    print(f"Files exported: {report.files_exported}")
    print(f"Files skipped: {report.files_skipped}")
    print(f"Links transformed: {report.links_transformed}")
    print(f"Images copied: {report.images_copied}")
    print()
    print("Category breakdown:")
    for category, count in sorted(report.categories.items()):
        print(f"  {category}: {count} files")
    print()

    if report.warnings:
        print(f"Warnings: {len(report.warnings)}")
        for warning in report.warnings[:5]:
            print(f"  - {warning}")
        if len(report.warnings) > 5:
            print(f"  ... and {len(report.warnings) - 5} more")
        print()

    if report.errors:
        print(f"Errors: {len(report.errors)}")
        for error in report.errors[:5]:
            print(f"  - {error}")
        if len(report.errors) > 5:
            print(f"  ... and {len(report.errors) - 5} more")

    print("=" * 80)
    print(f"Vault exported to: {output_dir}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
