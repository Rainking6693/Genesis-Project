"""
Script to enhance generate_backend method in builder_agent.py
"""

import os

# Read the current builder_agent.py
filepath = 'agents/builder_agent.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the generate_backend method
enhanced_backend = '''    async def generate_backend(self, app_name: str, api_routes: List[str], auth_required: bool = True) -> str:
        """
        Generate API routes and backend logic using LLM with excellence.

        Args:
            app_name: Name of the application
            api_routes: List of API endpoints to create
            auth_required: Whether authentication is required

        Returns:
            JSON string with backend API files
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a production-ready backend API for {app_name}.

        API Routes Required: {', '.join(api_routes)}
        Authentication: {'Required with JWT/OAuth2' if auth_required else 'Not required'}

        Generate complete backend with:
        1. RESTful API endpoints with proper HTTP methods
        2. Input validation and sanitization
        3. Error handling with appropriate status codes
        4. Database integration patterns
        5. Authentication/authorization middleware if required
        6. Rate limiting and security headers
        7. Logging and monitoring hooks
        8. Unit test examples for each endpoint

        Use modern patterns:
        - Next.js API routes or Express.js
        - TypeScript with strict typing
        - Async/await patterns
        - Environment variable configuration

        Return as JSON with file paths and complete, production-ready code.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                # Validate JSON response
                try:
                    json.loads(result)
                    return result
                except:
                    return json.dumps({
                        "app_name": app_name,
                        "api_routes": api_routes,
                        "auth_enabled": auth_required,
                        "generated_code": result,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating backend: {e}")
            return self._generate_backend_fallback(app_name, api_routes, auth_required)

    def _generate_backend_fallback(self, app_name: str, api_routes: List[str], auth_required: bool) -> str:
        """Fallback backend generation"""
        files = {}
        for route in api_routes:
            route_name = route.lower().replace(" ", "-")
            files[f"api/{route_name}/route.ts"] = f"// {route} endpoint placeholder"
        return json.dumps({"app_name": app_name, "files": files, "fallback": True})'''

# Find the generate_backend method and replace it
import re

# Pattern to match the entire generate_backend method
pattern = r'(    def generate_backend\(.*?\n(?:.*?\n)*?        return json\.dumps\(result, indent=2\))'

# Replace with enhanced version
content = re.sub(pattern, enhanced_backend, content, flags=re.DOTALL)

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Enhanced generate_backend method to use LLM with excellence")