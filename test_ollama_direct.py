"""Test Ollama API directly"""
import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            r = await client.post(
                'http://localhost:11434/api/chat',
                json={
                    'model': 'qwen2.5:14b-instruct-q4_K_M',
                    'messages': [{'role': 'user', 'content': 'Say hello'}],
                    'stream': False,
                    'options': {'num_predict': 10}
                }
            )
            print(f'Status: {r.status_code}')
            if r.status_code == 200:
                result = r.json()
                print(f'Response: {result.get("message", {}).get("content", "")}')
            else:
                print(f'Error: {r.text[:500]}')
        except Exception as e:
            print(f'Exception: {type(e).__name__}: {str(e)}')

if __name__ == "__main__":
    asyncio.run(test())


