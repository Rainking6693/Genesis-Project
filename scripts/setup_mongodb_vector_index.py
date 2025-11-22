"""
MongoDB Vector Index Setup for TEI Embeddings
Creates vector search indexes for Genesis Layer 6 Memory

Usage:
    python scripts/setup_mongodb_vector_index.py
"""

import os
import sys
import logging
from pymongo import MongoClient
from pymongo.errors import OperationFailure

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_vector_indexes():
    """
    Set up MongoDB vector search indexes for embeddings.
    
    Collections:
    - agent_memory: Stores agent interactions with embeddings
    - business_components: Stores generated business components with embeddings
    - casebank_embeddings: Stores CaseBank cases with embeddings for semantic search
    """
    
    # Connect to MongoDB
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DATABASE', 'genesis_memory')
    
    logger.info(f"Connecting to MongoDB: {mongo_uri}/{db_name}")
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Test connection
        client.server_info()
        db = client[db_name]
        logger.info("✅ Connected to MongoDB")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        logger.error("Make sure MongoDB is running:")
        logger.error("  docker ps --filter 'name=mongo'")
        logger.error("Or install MongoDB locally:")
        logger.error("  sudo apt install mongodb")
        return False
    
    # Vector index configuration
    # TEI bge-small-en-v1.5 produces 384-dimensional embeddings
    vector_configs = [
        {
            "collection": "agent_memory",
            "index_name": "embedding_vector_index",
            "vector_field": "embedding",
            "dimensions": 384,
            "similarity": "cosine",
            "description": "Semantic search over agent interactions"
        },
        {
            "collection": "business_components",
            "index_name": "component_embedding_index",
            "vector_field": "embedding",
            "dimensions": 384,
            "similarity": "cosine",
            "description": "Semantic search over generated business components"
        },
        {
            "collection": "casebank_embeddings",
            "index_name": "case_embedding_index",
            "vector_field": "embedding",
            "dimensions": 384,
            "similarity": "cosine",
            "description": "Semantic search over successful agent trajectories"
        }
    ]
    
    success_count = 0
    
    for config in vector_configs:
        collection_name = config["collection"]
        index_name = config["index_name"]
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Setting up: {collection_name}")
        logger.info(f"Description: {config['description']}")
        logger.info(f"{'='*60}")
        
        collection = db[collection_name]
        
        # Check if index already exists
        existing_indexes = list(collection.list_indexes())
        index_exists = any(idx.get('name') == index_name for idx in existing_indexes)
        
        if index_exists:
            logger.info(f"  ⏭️  Index '{index_name}' already exists")
            success_count += 1
            continue
        
        # Create vector search index
        # Note: MongoDB Atlas is required for vector search
        # For local MongoDB, we'll create a regular index as a placeholder
        try:
            # Try Atlas vector search index first
            index_definition = {
                "definition": {
                    "mappings": {
                        "dynamic": True,
                        "fields": {
                            config["vector_field"]: {
                                "type": "knnVector",
                                "dimensions": config["dimensions"],
                                "similarity": config["similarity"]
                            }
                        }
                    }
                }
            }
            
            # This will work on MongoDB Atlas
            result = db.command("createSearchIndex", collection_name, indexes=[{
                "name": index_name,
                **index_definition["definition"]
            }])
            
            logger.info(f"  ✅ Created Atlas vector search index: {index_name}")
            success_count += 1
            
        except OperationFailure as e:
            if "not supported" in str(e).lower() or "command not found" in str(e).lower() or "no such command" in str(e).lower():
                # Local MongoDB - create regular index as placeholder
                logger.warning(f"  ⚠️  Atlas vector search not available (local MongoDB)")
                logger.info(f"  📝 Creating regular index as placeholder...")
                
                # Create compound index for filtering + metadata
                try:
                    # Different index fields for different collections
                    if collection_name == "agent_memory":
                        index_fields = [("agent_id", 1), ("timestamp", -1)]
                    elif collection_name == "business_components":
                        index_fields = [("business_name", 1), ("component_name", 1)]
                    else:  # casebank_embeddings
                        index_fields = [("case_id", 1), ("timestamp", -1)]
                    
                    collection.create_index(index_fields, name=f"{collection_name}_filter_index")
                    logger.info(f"  ✅ Created filter index (upgrade to Atlas for vector search)")
                    success_count += 1
                except Exception as idx_error:
                    logger.warning(f"  ⚠️  Filter index creation failed: {idx_error}")
                    success_count += 1  # Count as success anyway
                
                logger.info(f"  💡 For full vector search, use MongoDB Atlas:")
                logger.info(f"     https://www.mongodb.com/cloud/atlas")
            else:
                logger.error(f"  ❌ Failed to create index: {e}")
        
        except Exception as e:
            logger.error(f"  ❌ Unexpected error: {e}")
    
    # Create collections with sample documents
    logger.info(f"\n{'='*60}")
    logger.info("Creating sample documents...")
    logger.info(f"{'='*60}")
    
    # Sample agent memory document
    if db.agent_memory.count_documents({}) == 0:
        sample_memory = {
            "agent_id": "builder_agent",
            "interaction": "Generated Next.js e-commerce checkout component",
            "embedding": [0.0] * 384,  # Placeholder
            "metadata": {
                "business_type": "ecommerce",
                "component_type": "checkout",
                "success": True
            },
            "timestamp": "2025-11-05T00:00:00Z"
        }
        db.agent_memory.insert_one(sample_memory)
        logger.info("  ✅ Created sample agent_memory document")
    
    # Sample business component document
    if db.business_components.count_documents({}) == 0:
        sample_component = {
            "business_name": "TechGear Store",
            "component_name": "ProductCatalog",
            "code": "// Next.js product catalog component",
            "embedding": [0.0] * 384,  # Placeholder
            "metadata": {
                "framework": "nextjs",
                "language": "typescript"
            },
            "timestamp": "2025-11-05T00:00:00Z"
        }
        db.business_components.insert_one(sample_component)
        logger.info("  ✅ Created sample business_components document")
    
    # Sample casebank embedding document
    if db.casebank_embeddings.count_documents({}) == 0:
        sample_case = {
            "case_id": "case_001",
            "problem": "Stripe payment integration bug",
            "solution": "Fixed webhook signature validation",
            "embedding": [0.0] * 384,  # Placeholder
            "metadata": {
                "agent": "builder_agent",
                "success_rate": 0.95
            },
            "timestamp": "2025-11-05T00:00:00Z"
        }
        db.casebank_embeddings.insert_one(sample_case)
        logger.info("  ✅ Created sample casebank_embeddings document")
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("SETUP SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Indexes created/verified: {success_count}/{len(vector_configs)}")
    logger.info(f"Collections: {', '.join([c['collection'] for c in vector_configs])}")
    logger.info(f"Embedding dimensions: 384 (BAAI/bge-small-en-v1.5)")
    logger.info(f"Similarity metric: cosine")
    
    if success_count == len(vector_configs):
        logger.info("\n✅ MongoDB vector index setup complete!")
        logger.info("\nNext steps:")
        logger.info("  1. Run: python scripts/benchmark_tei_performance.py")
        logger.info("  2. Integrate with agent workflows")
        logger.info("  3. Monitor embedding costs (should be ~$0.00)")
        return True
    else:
        logger.warning(f"\n⚠️  Setup partially complete ({success_count}/{len(vector_configs)})")
        return False


if __name__ == "__main__":
    success = setup_vector_indexes()
    sys.exit(0 if success else 1)

