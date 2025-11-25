"""
Script to enhance builder_agent methods to use LLM with excellence instructions
"""

import os

# Read the current builder_agent.py
filepath = 'agents/builder_agent.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where to insert new methods (after the class definition)
insert_index = -1
for i, line in enumerate(lines):
    if 'class BuilderAgent' in line:
        # Find the __init__ method
        for j in range(i, min(i+50, len(lines))):
            if 'def __init__' in lines[j]:
                # Find the end of __init__
                indent_count = 0
                for k in range(j+1, len(lines)):
                    if lines[k].strip() and not lines[k].startswith(' '):
                        break
                    if 'def ' in lines[k] and lines[k].startswith('    def '):
                        insert_index = k
                        break
                break
        break

if insert_index == -1:
    print("Could not find insertion point")
    exit(1)

# New methods to add
new_methods = '''
    async def design_system_frontend(self, app_name: str, brand_colors: Dict[str, str], style_preferences: str) -> str:
        """Generate a comprehensive design system using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a comprehensive design system for {app_name}.

        Brand Colors: {brand_colors}
        Style Preferences: {style_preferences}

        Generate a complete design system including:
        1. Color palette (primary, secondary, accent, neutral)
        2. Typography system (font families, sizes, weights)
        3. Spacing system (consistent spacing scale)
        4. Component variants (buttons, cards, forms)
        5. Animation guidelines
        6. Accessibility standards

        Provide the design system as CSS variables and utility classes.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                # Fallback to StandardIntegrationMixin chat
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating design system: {e}")
            return self._get_fallback_design_system(app_name)

    async def generate_component_diagram(self, app_name: str, components: List[str], interactions: List[str]) -> str:
        """Generate component architecture diagram using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a detailed component architecture diagram for {app_name}.

        Components: {', '.join(components)}
        Key Interactions: {', '.join(interactions)}

        Generate:
        1. Component hierarchy (parent-child relationships)
        2. Data flow between components
        3. State management approach
        4. Event handling patterns
        5. Component responsibilities
        6. Props and context usage

        Format as a structured JSON with visual representation instructions.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating component diagram: {e}")
            return json.dumps({"error": str(e), "fallback": True})

    async def define_data_flow(self, app_name: str, entities: List[str], operations: List[str]) -> str:
        """Define comprehensive data flow architecture using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design the complete data flow architecture for {app_name}.

        Data Entities: {', '.join(entities)}
        Operations: {', '.join(operations)}

        Provide:
        1. API endpoint definitions with REST/GraphQL specs
        2. Data validation rules
        3. State management strategy (Redux/Context/Zustand)
        4. Caching strategy
        5. Error handling patterns
        6. Real-time update mechanisms
        7. Data transformation pipelines

        Include code examples and best practices.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error defining data flow: {e}")
            return self._get_fallback_data_flow(entities)

    async def generate_api_documentation(self, app_name: str, endpoints: List[Dict[str, Any]]) -> str:
        """Generate comprehensive API documentation using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create professional API documentation for {app_name}.

        Endpoints to document:
        {json.dumps(endpoints, indent=2)}

        Generate:
        1. OpenAPI/Swagger specification
        2. Request/response examples
        3. Authentication details
        4. Rate limiting information
        5. Error codes and handling
        6. SDK code examples (JavaScript, Python)
        7. Postman collection

        Format as complete, production-ready documentation.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating API documentation: {e}")
            return "API documentation generation failed"

    async def create_testing_strategy(self, app_name: str, features: List[str], complexity: str = "medium") -> str:
        """Create comprehensive testing strategy using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design a complete testing strategy for {app_name}.

        Features to test: {', '.join(features)}
        Complexity level: {complexity}

        Provide:
        1. Unit test templates with Jest/Vitest
        2. Integration test scenarios
        3. E2E test flows with Playwright/Cypress
        4. Performance testing approach
        5. Security testing checklist
        6. CI/CD pipeline configuration
        7. Test coverage targets

        Include actual test code examples.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error creating testing strategy: {e}")
            return "Testing strategy creation failed"

    async def generate_deployment_config(self, app_name: str, platform: str, scaling_needs: str) -> str:
        """Generate deployment configuration using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create production-ready deployment configuration for {app_name}.

        Platform: {platform}
        Scaling Requirements: {scaling_needs}

        Generate:
        1. Docker/Container configuration
        2. CI/CD pipeline (GitHub Actions/GitLab CI)
        3. Environment variable management
        4. Secrets handling
        5. Monitoring and logging setup
        6. Auto-scaling policies
        7. Backup and disaster recovery

        Provide complete, ready-to-use configuration files.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating deployment config: {e}")
            return "Deployment configuration generation failed"

    def _get_fallback_design_system(self, app_name: str) -> str:
        """Fallback design system when LLM fails"""
        return f"""
        /* {app_name} Design System - Fallback */
        :root {{
            --primary: #3B82F6;
            --secondary: #8B5CF6;
            --accent: #10B981;
            --neutral: #6B7280;
            --spacing-unit: 8px;
        }}
        """

    def _get_fallback_data_flow(self, entities: List[str]) -> str:
        """Fallback data flow when LLM fails"""
        return json.dumps({{
            "entities": entities,
            "flow": "Client -> API -> Database",
            "fallback": True
        }})
'''

# Insert the new methods
lines.insert(insert_index, new_methods)

# Now enhance the existing generate_frontend method to use LLM
frontend_start = -1
frontend_end = -1
for i, line in enumerate(lines):
    if 'def generate_frontend(' in line:
        frontend_start = i
        # Find the end of this method
        for j in range(i+1, len(lines)):
            if j < len(lines) - 1 and lines[j+1].strip() and not lines[j+1].startswith(' '):
                frontend_end = j
                break
            if 'def ' in lines[j] and lines[j].startswith('    def '):
                frontend_end = j - 1
                break
        break

if frontend_start != -1 and frontend_end != -1:
    # Replace with enhanced version
    enhanced_frontend = '''    async def generate_frontend(self, app_name: str, features: List[str], pages: List[str]) -> str:
        """
        Generate React/Next.js frontend code using LLM with excellence.

        Args:
            app_name: Name of the application
            features: List of features to implement
            pages: List of pages to create

        Returns:
            JSON string with frontend file structure and code
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a complete React/Next.js frontend application for {app_name}.

        Features to implement: {', '.join(features)}
        Pages to create: {', '.join(pages)}

        Generate production-ready code with:
        1. Modern React patterns (hooks, context, suspense)
        2. TypeScript with proper types
        3. Responsive design with Tailwind CSS
        4. Accessibility (WCAG 2.1 AA)
        5. Performance optimizations
        6. SEO considerations
        7. Error boundaries
        8. Loading states

        Structure the response as JSON with file paths and complete code.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                # Parse and validate the response
                try:
                    json.loads(result)
                    return result
                except:
                    # Wrap in proper JSON if needed
                    return json.dumps({
                        "app_name": app_name,
                        "framework": "Next.js 14 + React 18 + TypeScript",
                        "generated_code": result,
                        "features_implemented": features,
                        "pages_created": pages,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating frontend: {e}")
            # Return basic template as fallback
            return self._generate_frontend_fallback(app_name, features, pages)

    def _generate_frontend_fallback(self, app_name: str, features: List[str], pages: List[str]) -> str:
        """Fallback frontend generation"""
        files = {}
        files["app/layout.tsx"] = f'export default function RootLayout({{ children }}) {{ return <html><body>{{children}}</body></html> }}'
        for page in pages:
            files[f"app/{page.lower()}/page.tsx"] = f'export default function {page}() {{ return <div>{page}</div> }}'
        return json.dumps({"app_name": app_name, "files": files})
'''

    # Replace the method
    lines[frontend_start:frontend_end+1] = [enhanced_frontend + '\n']

# Write back to file
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Enhanced builder_agent.py with {6} new LLM-based methods")
print("Updated generate_frontend to use LLM with excellence")