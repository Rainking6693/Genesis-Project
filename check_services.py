#!/usr/bin/env python3
"""Quick service health check"""
import httpx
import asyncio
import sys

async def check_services():
    """Check if required services are running"""
    results = {}
    
    # Check A2A Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get('http://localhost:8000/health')
            results['a2a'] = r.status_code == 200
    except:
        results['a2a'] = False
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get('http://localhost:11434/api/tags')
            results['ollama'] = r.status_code == 200
    except:
        results['ollama'] = False
    
    print(f"A2A Service: {'RUNNING' if results['a2a'] else 'NOT RUNNING'}")
    print(f"Ollama: {'RUNNING' if results['ollama'] else 'NOT RUNNING'}")
    
    return all(results.values())

if __name__ == "__main__":
    asyncio.run(check_services())

