"""
Social Media Agent Manager for Genesis Pipeline
Author: Genesis AI
Date: December 10, 2025

Manages automated posting to multiple social media platforms:
- Twitter/X (via Twitter API v2)
- Facebook (via Meta Graph API)
- Instagram (via Meta Graph API)
- LinkedIn (via LinkedIn API)
- TikTok (via Content Posting API)
- Pinterest (via Pinterest API v5)
- YouTube (via YouTube Data API v3)

Integrated with n8n for scheduling and workflow automation.
"""

import os
import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class Platform(Enum):
    """Supported social media platforms"""
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    PINTEREST = "pinterest"
    YOUTUBE = "youtube"


class PostType(Enum):
    """Types of social media posts"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CAROUSEL = "carousel"  # Multiple images
    STORY = "story"
    REEL = "reel"
    PIN = "pin"


@dataclass
class SocialPost:
    """Represents a social media post"""
    content: str
    post_type: PostType = PostType.TEXT
    media_urls: List[str] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    link: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_formatted_content(self, platform: Platform) -> str:
        """Format content with hashtags for specific platform"""
        hashtag_str = " ".join(f"#{tag}" for tag in self.hashtags)

        if platform == Platform.TWITTER:
            # Twitter: 280 char limit
            max_len = 280 - len(hashtag_str) - 1
            text = self.content[:max_len]
            return f"{text} {hashtag_str}".strip()

        elif platform == Platform.LINKEDIN:
            # LinkedIn: Professional tone, can be longer
            return f"{self.content}\n\n{hashtag_str}"

        elif platform in [Platform.INSTAGRAM, Platform.FACEBOOK]:
            # Meta platforms: Hashtags at the end
            return f"{self.content}\n\n{hashtag_str}"

        elif platform == Platform.TIKTOK:
            # TikTok: Hashtags inline
            return f"{self.content} {hashtag_str}"

        else:
            return f"{self.content} {hashtag_str}"


@dataclass
class PostResult:
    """Result of a social media post attempt"""
    platform: Platform
    success: bool
    post_id: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None
    rate_limit_remaining: Optional[int] = None


class SocialMediaClient(ABC):
    """Abstract base class for social media platform clients"""

    @abstractmethod
    async def post(self, post: SocialPost) -> PostResult:
        """Post content to the platform"""
        pass

    @abstractmethod
    async def verify_credentials(self) -> bool:
        """Verify API credentials are valid"""
        pass

    @abstractmethod
    def get_rate_limits(self) -> Dict[str, int]:
        """Get current rate limit status"""
        pass


class TwitterClient(SocialMediaClient):
    """Twitter/X API v2 client"""

    def __init__(self):
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        self.base_url = "https://api.twitter.com/2"

    async def verify_credentials(self) -> bool:
        if not self.bearer_token:
            return False
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.bearer_token}"}
                async with session.get(
                    f"{self.base_url}/users/me",
                    headers=headers
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"Twitter credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Post a tweet"""
        if not self.bearer_token:
            return PostResult(
                platform=Platform.TWITTER,
                success=False,
                error="Twitter credentials not configured"
            )

        try:
            # For OAuth 1.0a user context, we need additional auth
            # This is a simplified version using bearer token
            content = post.get_formatted_content(Platform.TWITTER)

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.bearer_token}",
                    "Content-Type": "application/json"
                }
                payload = {"text": content}

                async with session.post(
                    f"{self.base_url}/tweets",
                    headers=headers,
                    json=payload
                ) as resp:
                    if resp.status == 201:
                        data = await resp.json()
                        tweet_id = data.get("data", {}).get("id")
                        return PostResult(
                            platform=Platform.TWITTER,
                            success=True,
                            post_id=tweet_id,
                            url=f"https://twitter.com/i/web/status/{tweet_id}"
                        )
                    else:
                        error = await resp.text()
                        return PostResult(
                            platform=Platform.TWITTER,
                            success=False,
                            error=f"HTTP {resp.status}: {error}"
                        )

        except Exception as e:
            logger.error(f"Twitter post failed: {e}")
            return PostResult(
                platform=Platform.TWITTER,
                success=False,
                error=str(e)
            )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "tweets_per_day": 2400,
            "tweets_per_15min": 300
        }


class MetaClient(SocialMediaClient):
    """Meta (Facebook + Instagram) Graph API client"""

    def __init__(self, platform: Platform):
        self.platform = platform
        self.app_id = os.getenv("META_APP_ID")
        self.app_secret = os.getenv("META_APP_SECRET")
        self.access_token = os.getenv("META_ACCESS_TOKEN")
        self.page_id = os.getenv("META_PAGE_ID")
        self.instagram_id = os.getenv("META_INSTAGRAM_ACCOUNT_ID")
        self.base_url = "https://graph.facebook.com/v18.0"

    async def verify_credentials(self) -> bool:
        if not self.access_token:
            return False
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/me",
                    params={"access_token": self.access_token}
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"Meta credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Post to Facebook or Instagram"""
        if not self.access_token:
            return PostResult(
                platform=self.platform,
                success=False,
                error="Meta credentials not configured"
            )

        try:
            if self.platform == Platform.FACEBOOK:
                return await self._post_to_facebook(post)
            else:
                return await self._post_to_instagram(post)

        except Exception as e:
            logger.error(f"Meta post failed: {e}")
            return PostResult(
                platform=self.platform,
                success=False,
                error=str(e)
            )

    async def _post_to_facebook(self, post: SocialPost) -> PostResult:
        """Post to Facebook Page"""
        content = post.get_formatted_content(Platform.FACEBOOK)

        async with aiohttp.ClientSession() as session:
            params = {
                "message": content,
                "access_token": self.access_token
            }
            if post.link:
                params["link"] = post.link

            async with session.post(
                f"{self.base_url}/{self.page_id}/feed",
                params=params
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    post_id = data.get("id")
                    return PostResult(
                        platform=Platform.FACEBOOK,
                        success=True,
                        post_id=post_id,
                        url=f"https://facebook.com/{post_id}"
                    )
                else:
                    error = await resp.text()
                    return PostResult(
                        platform=Platform.FACEBOOK,
                        success=False,
                        error=f"HTTP {resp.status}: {error}"
                    )

    async def _post_to_instagram(self, post: SocialPost) -> PostResult:
        """Post to Instagram (requires media URL)"""
        if not post.media_urls:
            return PostResult(
                platform=Platform.INSTAGRAM,
                success=False,
                error="Instagram requires media (image/video)"
            )

        content = post.get_formatted_content(Platform.INSTAGRAM)

        async with aiohttp.ClientSession() as session:
            # Step 1: Create media container
            params = {
                "image_url": post.media_urls[0],
                "caption": content,
                "access_token": self.access_token
            }

            async with session.post(
                f"{self.base_url}/{self.instagram_id}/media",
                params=params
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    return PostResult(
                        platform=Platform.INSTAGRAM,
                        success=False,
                        error=f"Container creation failed: {error}"
                    )

                data = await resp.json()
                creation_id = data.get("id")

            # Step 2: Publish the container
            publish_params = {
                "creation_id": creation_id,
                "access_token": self.access_token
            }

            async with session.post(
                f"{self.base_url}/{self.instagram_id}/media_publish",
                params=publish_params
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    media_id = data.get("id")
                    return PostResult(
                        platform=Platform.INSTAGRAM,
                        success=True,
                        post_id=media_id,
                        url=f"https://instagram.com/p/{media_id}"
                    )
                else:
                    error = await resp.text()
                    return PostResult(
                        platform=Platform.INSTAGRAM,
                        success=False,
                        error=f"Publish failed: {error}"
                    )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "instagram_posts_per_day": 50,
            "facebook_posts_per_day": 200
        }


class LinkedInClient(SocialMediaClient):
    """LinkedIn API client"""

    def __init__(self):
        self.client_id = os.getenv("LINKEDIN_CLIENT_ID")
        self.client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
        self.access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
        self.org_id = os.getenv("LINKEDIN_ORGANIZATION_ID")
        self.base_url = "https://api.linkedin.com/v2"

    async def verify_credentials(self) -> bool:
        if not self.access_token:
            return False
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(
                    f"{self.base_url}/me",
                    headers=headers
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"LinkedIn credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Post to LinkedIn"""
        if not self.access_token:
            return PostResult(
                platform=Platform.LINKEDIN,
                success=False,
                error="LinkedIn credentials not configured"
            )

        try:
            content = post.get_formatted_content(Platform.LINKEDIN)

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0"
                }

                # Post as organization or personal
                author = f"urn:li:organization:{self.org_id}" if self.org_id else "urn:li:person:me"

                payload = {
                    "author": author,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {
                                "text": content
                            },
                            "shareMediaCategory": "NONE"
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                    }
                }

                if post.link:
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "ARTICLE"
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                        "status": "READY",
                        "originalUrl": post.link
                    }]

                async with session.post(
                    f"{self.base_url}/ugcPosts",
                    headers=headers,
                    json=payload
                ) as resp:
                    if resp.status in [200, 201]:
                        data = await resp.json()
                        post_id = data.get("id", "")
                        return PostResult(
                            platform=Platform.LINKEDIN,
                            success=True,
                            post_id=post_id,
                            url=f"https://linkedin.com/feed/update/{post_id}"
                        )
                    else:
                        error = await resp.text()
                        return PostResult(
                            platform=Platform.LINKEDIN,
                            success=False,
                            error=f"HTTP {resp.status}: {error}"
                        )

        except Exception as e:
            logger.error(f"LinkedIn post failed: {e}")
            return PostResult(
                platform=Platform.LINKEDIN,
                success=False,
                error=str(e)
            )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "posts_per_day": 100,
            "api_calls_per_day": 100000
        }


class TikTokClient(SocialMediaClient):
    """TikTok Content Posting API client"""

    def __init__(self):
        self.client_key = os.getenv("TIKTOK_CLIENT_KEY")
        self.client_secret = os.getenv("TIKTOK_CLIENT_SECRET")
        self.access_token = os.getenv("TIKTOK_ACCESS_TOKEN")
        self.base_url = "https://open.tiktokapis.com/v2"

    async def verify_credentials(self) -> bool:
        if not self.access_token:
            return False
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(
                    f"{self.base_url}/user/info/",
                    headers=headers
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"TikTok credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Post video to TikTok"""
        if not self.access_token:
            return PostResult(
                platform=Platform.TIKTOK,
                success=False,
                error="TikTok credentials not configured"
            )

        if post.post_type not in [PostType.VIDEO, PostType.REEL]:
            return PostResult(
                platform=Platform.TIKTOK,
                success=False,
                error="TikTok only supports video content"
            )

        if not post.media_urls:
            return PostResult(
                platform=Platform.TIKTOK,
                success=False,
                error="Video URL required for TikTok post"
            )

        try:
            content = post.get_formatted_content(Platform.TIKTOK)

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }

                # Initialize video upload
                init_payload = {
                    "post_info": {
                        "title": content[:150],  # TikTok title limit
                        "privacy_level": "SELF_ONLY",  # Unaudited apps limited to private
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": post.media_urls[0]
                    }
                }

                async with session.post(
                    f"{self.base_url}/post/publish/video/init/",
                    headers=headers,
                    json=init_payload
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        publish_id = data.get("data", {}).get("publish_id")
                        return PostResult(
                            platform=Platform.TIKTOK,
                            success=True,
                            post_id=publish_id,
                            url=None  # TikTok doesn't return direct URL
                        )
                    else:
                        error = await resp.text()
                        return PostResult(
                            platform=Platform.TIKTOK,
                            success=False,
                            error=f"HTTP {resp.status}: {error}"
                        )

        except Exception as e:
            logger.error(f"TikTok post failed: {e}")
            return PostResult(
                platform=Platform.TIKTOK,
                success=False,
                error=str(e)
            )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "posts_per_day_per_user": 15,
            "unaudited_users_per_day": 5
        }


class PinterestClient(SocialMediaClient):
    """Pinterest API v5 client"""

    def __init__(self):
        self.app_id = os.getenv("PINTEREST_APP_ID")
        self.app_secret = os.getenv("PINTEREST_APP_SECRET")
        self.access_token = os.getenv("PINTEREST_ACCESS_TOKEN")
        self.board_id = os.getenv("PINTEREST_BOARD_ID")
        self.base_url = "https://api.pinterest.com/v5"

    async def verify_credentials(self) -> bool:
        if not self.access_token:
            return False
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(
                    f"{self.base_url}/user_account",
                    headers=headers
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"Pinterest credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Create a Pin on Pinterest"""
        if not self.access_token:
            return PostResult(
                platform=Platform.PINTEREST,
                success=False,
                error="Pinterest credentials not configured"
            )

        if not post.media_urls:
            return PostResult(
                platform=Platform.PINTEREST,
                success=False,
                error="Pinterest requires an image"
            )

        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }

                payload = {
                    "board_id": self.board_id,
                    "media_source": {
                        "source_type": "image_url",
                        "url": post.media_urls[0]
                    },
                    "title": post.content[:100],  # Pinterest title limit
                    "description": post.get_formatted_content(Platform.PINTEREST),
                    "alt_text": post.content[:500]
                }

                if post.link:
                    payload["link"] = post.link

                async with session.post(
                    f"{self.base_url}/pins",
                    headers=headers,
                    json=payload
                ) as resp:
                    if resp.status in [200, 201]:
                        data = await resp.json()
                        pin_id = data.get("id")
                        return PostResult(
                            platform=Platform.PINTEREST,
                            success=True,
                            post_id=pin_id,
                            url=f"https://pinterest.com/pin/{pin_id}"
                        )
                    else:
                        error = await resp.text()
                        return PostResult(
                            platform=Platform.PINTEREST,
                            success=False,
                            error=f"HTTP {resp.status}: {error}"
                        )

        except Exception as e:
            logger.error(f"Pinterest post failed: {e}")
            return PostResult(
                platform=Platform.PINTEREST,
                success=False,
                error=str(e)
            )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "pins_per_hour": 50,
            "api_calls_per_hour": 1000
        }


class YouTubeClient(SocialMediaClient):
    """YouTube Data API v3 client"""

    def __init__(self):
        self.client_id = os.getenv("YOUTUBE_CLIENT_ID")
        self.client_secret = os.getenv("YOUTUBE_CLIENT_SECRET")
        self.refresh_token = os.getenv("YOUTUBE_REFRESH_TOKEN")
        self.channel_id = os.getenv("YOUTUBE_CHANNEL_ID")
        self.access_token = None
        self.base_url = "https://www.googleapis.com/youtube/v3"

    async def _refresh_access_token(self) -> bool:
        """Refresh OAuth access token"""
        if not self.refresh_token:
            return False

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token"
                }
                async with session.post(
                    "https://oauth2.googleapis.com/token",
                    data=payload
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.access_token = data.get("access_token")
                        return True
            return False
        except Exception as e:
            logger.error(f"YouTube token refresh failed: {e}")
            return False

    async def verify_credentials(self) -> bool:
        if not await self._refresh_access_token():
            return False
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(
                    f"{self.base_url}/channels",
                    headers=headers,
                    params={"part": "snippet", "mine": "true"}
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"YouTube credential verification failed: {e}")
            return False

    async def post(self, post: SocialPost) -> PostResult:
        """Upload video to YouTube"""
        if not await self._refresh_access_token():
            return PostResult(
                platform=Platform.YOUTUBE,
                success=False,
                error="YouTube credentials not configured"
            )

        if post.post_type != PostType.VIDEO:
            return PostResult(
                platform=Platform.YOUTUBE,
                success=False,
                error="YouTube only supports video uploads"
            )

        # YouTube upload requires resumable upload protocol
        # This is a simplified representation - real implementation
        # would need to handle chunked uploads

        return PostResult(
            platform=Platform.YOUTUBE,
            success=False,
            error="YouTube upload requires video file path - use n8n workflow for full implementation"
        )

    def get_rate_limits(self) -> Dict[str, int]:
        return {
            "quota_units_per_day": 10000,
            "upload_cost_units": 1600
        }


class SocialMediaAgentManager:
    """
    Central manager for all social media operations.
    Coordinates posting across platforms and integrates with n8n.
    """

    def __init__(self):
        self.clients: Dict[Platform, SocialMediaClient] = {}
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize all configured platform clients"""
        # Twitter
        if os.getenv("TWITTER_BEARER_TOKEN"):
            self.clients[Platform.TWITTER] = TwitterClient()

        # Facebook
        if os.getenv("META_ACCESS_TOKEN") and os.getenv("META_PAGE_ID"):
            self.clients[Platform.FACEBOOK] = MetaClient(Platform.FACEBOOK)

        # Instagram
        if os.getenv("META_ACCESS_TOKEN") and os.getenv("META_INSTAGRAM_ACCOUNT_ID"):
            self.clients[Platform.INSTAGRAM] = MetaClient(Platform.INSTAGRAM)

        # LinkedIn
        if os.getenv("LINKEDIN_ACCESS_TOKEN"):
            self.clients[Platform.LINKEDIN] = LinkedInClient()

        # TikTok
        if os.getenv("TIKTOK_ACCESS_TOKEN"):
            self.clients[Platform.TIKTOK] = TikTokClient()

        # Pinterest
        if os.getenv("PINTEREST_ACCESS_TOKEN"):
            self.clients[Platform.PINTEREST] = PinterestClient()

        # YouTube
        if os.getenv("YOUTUBE_REFRESH_TOKEN"):
            self.clients[Platform.YOUTUBE] = YouTubeClient()

        logger.info(f"SocialMediaAgentManager initialized with {len(self.clients)} platforms: {list(self.clients.keys())}")

    def get_configured_platforms(self) -> List[Platform]:
        """Get list of platforms with valid credentials"""
        return list(self.clients.keys())

    async def verify_all_credentials(self) -> Dict[Platform, bool]:
        """Verify credentials for all configured platforms"""
        results = {}
        for platform, client in self.clients.items():
            results[platform] = await client.verify_credentials()
        return results

    async def post_to_platform(
        self,
        platform: Platform,
        post: SocialPost
    ) -> PostResult:
        """Post to a single platform"""
        if platform not in self.clients:
            return PostResult(
                platform=platform,
                success=False,
                error=f"Platform {platform.value} not configured"
            )

        client = self.clients[platform]
        return await client.post(post)

    async def post_to_all(
        self,
        post: SocialPost,
        platforms: Optional[List[Platform]] = None
    ) -> List[PostResult]:
        """
        Post to multiple platforms simultaneously.
        If platforms is None, posts to all configured platforms.
        """
        target_platforms = platforms or list(self.clients.keys())

        # Filter to only configured platforms
        target_platforms = [p for p in target_platforms if p in self.clients]

        if not target_platforms:
            return [PostResult(
                platform=Platform.TWITTER,
                success=False,
                error="No configured platforms to post to"
            )]

        # Post to all platforms concurrently
        tasks = [self.post_to_platform(p, post) for p in target_platforms]
        results = await asyncio.gather(*tasks)

        return list(results)

    async def create_campaign(
        self,
        business_name: str,
        business_url: str,
        description: str,
        platforms: Optional[List[Platform]] = None
    ) -> Dict[str, Any]:
        """
        Create a social media campaign for a newly deployed business.
        Generates platform-appropriate content and posts to all platforms.
        """
        # Generate hashtags from business name
        hashtags = [
            business_name.replace(" ", "").lower(),
            "startup",
            "newbusiness",
            "launch"
        ]

        # Create launch announcement post
        launch_post = SocialPost(
            content=f"Introducing {business_name}! {description} Check it out now.",
            post_type=PostType.TEXT,
            hashtags=hashtags,
            link=business_url
        )

        results = await self.post_to_all(launch_post, platforms)

        # Compile campaign report
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]

        return {
            "business_name": business_name,
            "business_url": business_url,
            "total_platforms": len(results),
            "successful_posts": len(successful),
            "failed_posts": len(failed),
            "results": [
                {
                    "platform": r.platform.value,
                    "success": r.success,
                    "post_url": r.url,
                    "error": r.error
                }
                for r in results
            ]
        }

    def get_all_rate_limits(self) -> Dict[str, Dict[str, int]]:
        """Get rate limits for all configured platforms"""
        return {
            platform.value: client.get_rate_limits()
            for platform, client in self.clients.items()
        }


def get_social_media_agent() -> SocialMediaAgentManager:
    """Factory function to get SocialMediaAgentManager instance"""
    return SocialMediaAgentManager()


# Integration with Genesis Pipeline
async def post_business_launch(
    business_name: str,
    business_url: str,
    description: str,
    platforms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Convenience function to post business launch announcement.
    Called from Genesis Pipeline after successful deployment.

    Args:
        business_name: Name of the business
        business_url: Live URL of the deployed business
        description: Short description of the business
        platforms: List of platform names (optional)

    Returns:
        Campaign results dict
    """
    manager = get_social_media_agent()

    # Convert platform names to enum
    platform_enums = None
    if platforms:
        platform_enums = [Platform(p.lower()) for p in platforms if p.lower() in [e.value for e in Platform]]

    return await manager.create_campaign(
        business_name=business_name,
        business_url=business_url,
        description=description,
        platforms=platform_enums
    )


if __name__ == "__main__":
    # Test the social media agent
    import sys
    sys.path.insert(0, ".")

    from infrastructure.load_env import load_genesis_env
    load_genesis_env()

    logging.basicConfig(level=logging.INFO)

    async def test():
        manager = get_social_media_agent()

        print("\n=== Social Media Agent Manager ===")
        print(f"Configured platforms: {[p.value for p in manager.get_configured_platforms()]}")

        print("\n--- Verifying credentials ---")
        creds = await manager.verify_all_credentials()
        for platform, valid in creds.items():
            status = "OK" if valid else "INVALID"
            print(f"  {platform.value}: {status}")

        print("\n--- Rate limits ---")
        limits = manager.get_all_rate_limits()
        for platform, platform_limits in limits.items():
            print(f"  {platform}:")
            for key, value in platform_limits.items():
                print(f"    {key}: {value}")

    asyncio.run(test())
