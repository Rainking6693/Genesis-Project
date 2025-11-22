# VOIX in 10 Minutes - Quick Start Guide for Websites

**Integration #74: VOIX Declarative Discovery Layer**

This guide shows you how to add VOIX support to your website in under 10 minutes. VOIX enables AI agents to interact with your website efficiently using declarative `<tool>` and `<context>` HTML tags.

## Why VOIX?

**Benefits for Website Owners:**
- **10-25x faster** automation (50-200ms vs 2-5s)
- **99%+ success rate** (vs 90% with vision-based automation)
- **Zero DOM parsing overhead** (direct tag access)
- **Better user experience** (faster AI interactions)
- **Reduced server load** (fewer failed automation attempts)

## Getting Started

### Step 1: Add `<tool>` Tags (5 minutes)

Add `<tool>` tags to your HTML to expose actions that AI agents can invoke.

**Basic Example:**

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- VOIX Tool: Submit Product -->
    <tool 
        name="submit_product"
        description="Submit a product to directory"
        method="POST"
        endpoint="/api/submit"
        auth="session">
        <parameter name="name" type="string" required="true" />
        <parameter name="description" type="string" required="true" />
        <parameter name="category" type="string" required="false" />
    </tool>

    <!-- Your existing HTML -->
    <form action="/submit" method="post">
        <input name="name" type="text" placeholder="Product Name" />
        <textarea name="description" placeholder="Description"></textarea>
        <select name="category">
            <option value="productivity">Productivity</option>
            <option value="education">Education</option>
        </select>
        <button type="submit">Submit</button>
    </form>
</body>
</html>
```

### Step 2: Add `<context>` Tags (2 minutes)

Add `<context>` tags to expose structured data that AI agents can extract.

**Basic Example:**

```html
<!-- VOIX Context: Current User -->
<context 
    name="current_user_id"
    value="12345"
    ttl="3600"
    scope="session" />

<!-- VOIX Context: Product Status -->
<context 
    name="product_status"
    value="active"
    ttl="1800"
    scope="page" />
```

### Step 3: Handle Tool Invocations (3 minutes)

Update your backend to handle VOIX tool invocations.

**Example (Python Flask):**

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/api/submit', methods=['POST'])
def submit_product():
    """Handle VOIX tool invocation"""
    data = request.json
    
    # Validate parameters
    name = data.get('name')
    description = data.get('description')
    category = data.get('category', 'productivity')
    
    if not name or not description:
        return jsonify({
            'success': False,
            'error': 'Missing required parameters'
        }), 400
    
    # Process submission
    # ... your business logic ...
    
    return jsonify({
        'success': True,
        'id': '12345',
        'message': 'Product submitted successfully'
    }), 200

if __name__ == '__main__':
    app.run()
```

**Example (Node.js Express):**

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/submit', (req, res) => {
  const { name, description, category = 'productivity' } = req.body;
  
  // Validate parameters
  if (!name || !description) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters'
    });
  }
  
  // Process submission
  // ... your business logic ...
  
  res.json({
    success: true,
    id: '12345',
    message: 'Product submitted successfully'
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Complete Examples

### Example 1: Product Submission Form

```html
<!DOCTYPE html>
<html>
<head>
    <title>Product Directory</title>
</head>
<body>
    <!-- VOIX Tool: Submit Product -->
    <tool 
        name="submit_product"
        description="Submit a product to directory"
        method="POST"
        endpoint="/api/products/submit"
        auth="session">
        <parameter name="name" type="string" required="true" />
        <parameter name="description" type="string" required="true" />
        <parameter name="website_url" type="string" required="true" />
        <parameter name="category" type="string" required="false" />
        <parameter name="tagline" type="string" required="false" />
    </tool>

    <!-- VOIX Context: Available Categories -->
    <context 
        name="available_categories"
        value='["productivity", "education", "health", "finance"]'
        ttl="86400"
        scope="page" />

    <!-- Your existing form -->
    <form id="product-form">
        <input name="name" type="text" required />
        <textarea name="description" required></textarea>
        <input name="website_url" type="url" required />
        <select name="category">
            <option value="productivity">Productivity</option>
            <option value="education">Education</option>
            <option value="health">Health</option>
            <option value="finance">Finance</option>
        </select>
        <input name="tagline" type="text" />
        <button type="submit">Submit Product</button>
    </form>
</body>
</html>
```

### Example 2: User Registration

```html
<!DOCTYPE html>
<html>
<head>
    <title>User Registration</title>
</head>
<body>
    <!-- VOIX Tool: Register User -->
    <tool 
        name="register_user"
        description="Register a new user account"
        method="POST"
        endpoint="/api/users/register"
        auth="none">
        <parameter name="email" type="string" required="true" />
        <parameter name="password" type="string" required="true" />
        <parameter name="full_name" type="string" required="true" />
    </tool>

    <!-- VOIX Context: Registration Requirements -->
    <context 
        name="password_requirements"
        value='{"min_length": 8, "require_uppercase": true, "require_numbers": true}'
        ttl="86400"
        scope="page" />

    <!-- Your existing form -->
    <form id="register-form">
        <input name="email" type="email" required />
        <input name="password" type="password" required />
        <input name="full_name" type="text" required />
        <button type="submit">Register</button>
    </form>
</body>
</html>
```

## Tool Tag Schema

### Required Attributes

- **`name`** (string, required): Unique tool identifier
- **`description`** (string, required): Human-readable tool description
- **`method`** (string, required): HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
- **`endpoint`** (string, required): API endpoint path (absolute or relative)

### Optional Attributes

- **`auth`** (string, optional): Authentication type (`session`, `bearer`, `none`)
  - `session`: Uses session cookies
  - `bearer`: Requires Bearer token in Authorization header
  - `none`: No authentication required (default)
- **`visible`** (boolean, optional): Tool visibility flag (default: `true`)

### Parameters

Each `<parameter>` defines a tool input:

- **`name`** (string, required): Parameter name
- **`type`** (string, required): Parameter type (`string`, `number`, `boolean`, `object`, `array`)
- **`required`** (boolean, optional): Whether parameter is required (default: `false`)

## Context Tag Schema

### Required Attributes

- **`name`** (string, required): Context key
- **`value`** (string, required): Context value (JSON-serializable)

### Optional Attributes

- **`ttl`** (number, optional): Time-to-live in seconds (default: infinite)
- **`scope`** (string, optional): Context scope (`page`, `session`, `global`)
  - `page`: Context valid for current page
  - `session`: Context valid for user session
  - `global`: Context valid across all pages

## Authentication Options

### Session Authentication

```html
<tool 
    name="submit_product"
    method="POST"
    endpoint="/api/submit"
    auth="session">
    <!-- Session cookies are automatically included -->
</tool>
```

**Backend (Flask):**

```python
from flask import session

@app.route('/api/submit', methods=['POST'])
def submit_product():
    # Session is automatically available
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    # ... process submission ...
```

### Bearer Token Authentication

```html
<tool 
    name="submit_product"
    method="POST"
    endpoint="/api/submit"
    auth="bearer">
    <!-- Bearer token must be provided by agent -->
</tool>
```

**Backend (Flask):**

```python
from flask import request

@app.route('/api/submit', methods=['POST'])
def submit_product():
    # Bearer token is in Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    # ... validate token and process submission ...
```

## Dynamic Content Handling

VOIX automatically handles dynamic content via MutationObserver. When DOM changes occur, VOIX re-scans for new tools and contexts.

**Example with Dynamic Content:**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Dynamic Content Example</title>
</head>
<body>
    <!-- Initial tool -->
    <tool name="initial_tool" method="GET" endpoint="/api/initial" auth="none" />

    <script>
        // Dynamically add new tool when content loads
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const dynamicTool = document.createElement('tool');
                dynamicTool.setAttribute('name', 'dynamic_tool');
                dynamicTool.setAttribute('method', 'POST');
                dynamicTool.setAttribute('endpoint', '/api/dynamic');
                dynamicTool.setAttribute('auth', 'none');
                document.body.appendChild(dynamicTool);
            }, 1000);
        });
    </script>
</body>
</html>
```

VOIX will automatically detect the new tool when it's added to the DOM.

## Error Handling

Return standard JSON error responses when tool invocations fail:

```python
@app.route('/api/submit', methods=['POST'])
def submit_product():
    try:
        data = request.json
        
        # Validate parameters
        if not data.get('name'):
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: name'
            }), 400
        
        # Process submission
        # ... your business logic ...
        
        return jsonify({
            'success': True,
            'id': '12345'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

## Best Practices

1. **Use descriptive names:** Tool names should be clear and descriptive
2. **Validate parameters:** Always validate parameters in your backend
3. **Return consistent responses:** Use standard JSON format for success/error
4. **Set appropriate TTLs:** Use TTL for context values that change frequently
5. **Document your tools:** Include clear descriptions for each tool
6. **Handle errors gracefully:** Return meaningful error messages

## Testing

Test your VOIX implementation using the Genesis automation system:

```python
from infrastructure.browser_automation.hybrid_automation import (
    get_hybrid_automation,
    AutomationMode
)

automation = get_hybrid_automation()

result = await automation.execute_task(
    url="https://your-website.com",
    task="Submit product",
    data={"name": "TestApp", "description": "Test description"},
    mode=AutomationMode.AUTO
)

print(f"Success: {result.success}")
print(f"Mode: {result.mode_used.value}")
print(f"Time: {result.latency_ms:.0f}ms")
```

## Next Steps

1. **Add VOIX tags** to your website
2. **Test tool invocations** using Genesis automation
3. **Monitor performance** improvements
4. **Iterate and improve** based on agent feedback

## Resources

- **Full Documentation:** `docs/integrations/VOIX_INTEGRATION.md`
- **Integration Guide:** `VOIX_FRAMEWORK_INTEGRATION.md`
- **Paper:** [arXiv:2511.11287 - Building the Web for Agents](https://arxiv.org/abs/2511.11287)

## Support

For questions or issues, please contact the Genesis team or submit an issue on GitHub.

