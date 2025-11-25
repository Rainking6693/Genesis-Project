"""
Script to enhance generate_database method in builder_agent.py
"""

import os

# Read the current builder_agent.py
filepath = 'agents/builder_agent.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Enhanced database method
enhanced_database = '''    async def generate_database(self, app_name: str, tables: List[str], relationships: bool = True) -> str:
        """
        Generate database schemas and migrations using LLM with excellence.

        Args:
            app_name: Name of the application
            tables: List of database tables to create
            relationships: Whether to include foreign key relationships

        Returns:
            JSON string with database schema and migrations
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design a complete database architecture for {app_name}.

        Tables Required: {', '.join(tables)}
        Include Relationships: {'Yes - with foreign keys and indexes' if relationships else 'No - independent tables'}

        Generate production-ready database design with:
        1. Complete schema definitions (PostgreSQL/MySQL compatible)
        2. Proper data types and constraints
        3. Primary keys and indexes for performance
        4. Foreign key relationships if required
        5. Migration files (up and down)
        6. Seed data examples
        7. Database access layer (ORM models)
        8. Query optimization suggestions

        Best practices:
        - Use UUID for primary keys
        - Add created_at and updated_at timestamps
        - Include soft delete capability
        - Add appropriate indexes for common queries
        - Consider JSONB fields for flexible data

        Return as JSON with schema definitions, migrations, and ORM models.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                try:
                    json.loads(result)
                    return result
                except:
                    return json.dumps({
                        "app_name": app_name,
                        "tables": tables,
                        "relationships_enabled": relationships,
                        "generated_schema": result,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating database: {e}")
            return self._generate_database_fallback(app_name, tables)

    def _generate_database_fallback(self, app_name: str, tables: List[str]) -> str:
        """Fallback database generation"""
        schema = {}
        for table in tables:
            schema[table] = {
                "id": "UUID PRIMARY KEY",
                "created_at": "TIMESTAMP DEFAULT NOW()",
                "updated_at": "TIMESTAMP DEFAULT NOW()"
            }
        return json.dumps({"app_name": app_name, "schema": schema, "fallback": True})'''

# Find and replace the generate_database method
import re

# Pattern to match the entire generate_database method
pattern = r'(    def generate_database\(.*?\n(?:.*?\n)*?        return json\.dumps\(result, indent=2\))'

# Replace with enhanced version
content = re.sub(pattern, enhanced_database, content, flags=re.DOTALL)

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Enhanced generate_database method to use LLM with excellence")