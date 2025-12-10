"""
Open Source Alternatives Database for Genesis Agents

This module provides a comprehensive database of open source alternatives
to paid services. Agents should consult this database when they need any
service to find free, self-hosted alternatives first.

Source: https://www.opensourcealternative.to/
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ServiceCategory(Enum):
    """Categories of services"""
    DEPLOYMENT = "deployment"
    BACKEND = "backend"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    ANALYTICS = "analytics"
    MONITORING = "monitoring"
    EMAIL = "email"
    STORAGE = "storage"
    CRM = "crm"
    PAYMENT = "payment"
    COMMUNICATION = "communication"
    DOCUMENTATION = "documentation"
    DESIGN = "design"
    CI_CD = "ci_cd"
    SEARCH = "search"
    QUEUE = "queue"


@dataclass
class OpenSourceAlternative:
    """Represents an open source alternative to a paid service"""
    name: str
    category: ServiceCategory
    description: str
    website: str
    github: str
    replaces: List[str]  # List of paid services it can replace
    features: List[str]
    self_hosted: bool = True
    docker_support: bool = True
    active_development: bool = True
    stars: int = 0
    license: str = "MIT"

    def __str__(self) -> str:
        return f"{self.name} - {self.description}"


# ============================================================================
# DEPLOYMENT PLATFORMS (Alternatives to Vercel, Netlify, Heroku)
# ============================================================================

COOLIFY = OpenSourceAlternative(
    name="Coolify",
    category=ServiceCategory.DEPLOYMENT,
    description="Self-hostable PaaS alternative to Vercel, Heroku & Netlify. Deploy static sites, databases, and 280+ one-click services.",
    website="https://coolify.io/",
    github="https://github.com/coollabsio/coolify",
    replaces=["Vercel", "Netlify", "Heroku", "GitHub Pages", "Railway", "Render"],
    features=[
        "Git integration (GitHub, GitLab, Bitbucket, Gitea)",
        "Automatic SSL certificates via Let's Encrypt",
        "One-click app deployments",
        "Database management",
        "Docker-based deployments",
        "Web UI for management",
        "Supports static sites, Node.js, Python, PHP, Go, and more",
        "Deploy to any server with SSH",
        "Built-in monitoring",
        "Automatic backups"
    ],
    stars=35000,
    license="Apache-2.0"
)

DOKKU = OpenSourceAlternative(
    name="Dokku",
    category=ServiceCategory.DEPLOYMENT,
    description="Mini-Heroku. Lightweight self-hosted PaaS solution with Heroku-style git push deployments.",
    website="https://dokku.com/",
    github="https://github.com/dokku/dokku",
    replaces=["Heroku", "Railway", "Render"],
    features=[
        "Git push deployments",
        "Buildpacks support",
        "Docker-based",
        "Plugin system for databases, SSL, storage",
        "Multiple apps per server",
        "Custom domains",
        "Environment variables management",
        "Zero-downtime deploys",
        "CLI-based management"
    ],
    stars=28000,
    license="MIT"
)

CAPROVER = OpenSourceAlternative(
    name="CapRover",
    category=ServiceCategory.DEPLOYMENT,
    description="Self-hosted PaaS for easy app/database deployment with web UI.",
    website="https://caprover.com/",
    github="https://github.com/caprover/caprover",
    replaces=["Heroku", "Railway", "DigitalOcean App Platform"],
    features=[
        "Web-based dashboard",
        "One-click apps (MongoDB, MySQL, WordPress, etc.)",
        "Free SSL with Let's Encrypt",
        "Multiple deployment methods (dashboard, CLI, webhooks)",
        "Docker Swarm support",
        "Cluster mode for scaling",
        "NetData monitoring built-in",
        "Automatic HTTPS"
    ],
    stars=13000,
    license="Apache-2.0"
)

DOKPLOY = OpenSourceAlternative(
    name="Dokploy",
    category=ServiceCategory.DEPLOYMENT,
    description="Modern alternative to Vercel, Netlify, and Heroku with a beautiful UI.",
    website="https://dokploy.com/",
    github="https://github.com/Dokploy/dokploy",
    replaces=["Vercel", "Netlify", "Heroku"],
    features=[
        "Modern web UI",
        "Docker and Nixpacks support",
        "Database deployments",
        "SSL certificates",
        "GitHub/GitLab integration",
        "Real-time logs",
        "Automatic deployments"
    ],
    stars=8000,
    license="Apache-2.0"
)

# ============================================================================
# BACKEND AS A SERVICE (Alternatives to Firebase, Supabase alternatives)
# ============================================================================

CONDUIT = OpenSourceAlternative(
    name="Conduit",
    category=ServiceCategory.BACKEND,
    description="Batteries-included backend that works with any stack. Self-hosted BaaS with authentication, database, chat, and more.",
    website="https://getconduit.dev/",
    github="https://github.com/ConduitPlatform/Conduit",
    replaces=["Firebase", "AWS Amplify", "Parse", "Back4App"],
    features=[
        "Authentication (email/password, social login, 2FA)",
        "Database management (MongoDB, SQL)",
        "Real-time chat via WebSockets",
        "Email delivery with templates",
        "SMS for 2FA",
        "Push notifications",
        "File storage (Azure, GCloud, AWS)",
        "REST and GraphQL APIs",
        "Rate limiting",
        "Health monitoring",
        "SDK extensions for custom logic"
    ],
    stars=500,
    license="Apache-2.0"
)

APPWRITE = OpenSourceAlternative(
    name="Appwrite",
    category=ServiceCategory.BACKEND,
    description="Open source Firebase alternative. Complete backend server for web, mobile, and Flutter.",
    website="https://appwrite.io/",
    github="https://github.com/appwrite/appwrite",
    replaces=["Firebase", "AWS Amplify", "Auth0 + Hasura"],
    features=[
        "Authentication (50+ login methods)",
        "Database with relationships",
        "Real-time subscriptions",
        "File storage",
        "Cloud functions",
        "Messaging (push, email, SMS)",
        "SDKs for all platforms",
        "Teams and permissions",
        "Built-in security"
    ],
    stars=45000,
    license="BSD-3-Clause"
)

SUPABASE = OpenSourceAlternative(
    name="Supabase",
    category=ServiceCategory.BACKEND,
    description="Open source Firebase alternative with Postgres database, authentication, storage, and edge functions.",
    website="https://supabase.com/",
    github="https://github.com/supabase/supabase",
    replaces=["Firebase", "AWS Amplify"],
    features=[
        "PostgreSQL database",
        "Authentication",
        "Real-time subscriptions",
        "Storage",
        "Edge functions",
        "Vector embeddings for AI",
        "Row-level security",
        "Auto-generated APIs",
        "Dashboard"
    ],
    stars=75000,
    license="Apache-2.0"
)

POCKETBASE = OpenSourceAlternative(
    name="PocketBase",
    category=ServiceCategory.BACKEND,
    description="Open source backend in a single Go binary. Perfect for small to medium projects.",
    website="https://pocketbase.io/",
    github="https://github.com/pocketbase/pocketbase",
    replaces=["Firebase", "Supabase (for smaller projects)"],
    features=[
        "SQLite database",
        "Real-time subscriptions",
        "Authentication",
        "File storage",
        "Admin dashboard",
        "REST API",
        "Single binary deployment",
        "Hooks and extensions",
        "S3-compatible storage"
    ],
    stars=40000,
    license="MIT"
)

# ============================================================================
# DATABASE (Alternatives to managed databases)
# ============================================================================

NEON = OpenSourceAlternative(
    name="Neon",
    category=ServiceCategory.DATABASE,
    description="Serverless Postgres with branching, autoscaling, and bottomless storage.",
    website="https://neon.tech/",
    github="https://github.com/neondatabase/neon",
    replaces=["AWS RDS", "Planetscale", "CockroachDB"],
    features=[
        "Serverless PostgreSQL",
        "Database branching",
        "Autoscaling",
        "Point-in-time recovery",
        "Generous free tier"
    ],
    stars=15000,
    license="Apache-2.0"
)

# ============================================================================
# AUTHENTICATION (Alternatives to Auth0, Okta)
# ============================================================================

KEYCLOAK = OpenSourceAlternative(
    name="Keycloak",
    category=ServiceCategory.AUTHENTICATION,
    description="Open source identity and access management. Enterprise-grade SSO and identity federation.",
    website="https://www.keycloak.org/",
    github="https://github.com/keycloak/keycloak",
    replaces=["Auth0", "Okta", "AWS Cognito"],
    features=[
        "Single Sign-On (SSO)",
        "Identity brokering",
        "Social login",
        "User federation (LDAP, Active Directory)",
        "Multi-factor authentication",
        "Fine-grained authorization",
        "Admin console",
        "Account management console"
    ],
    stars=23000,
    license="Apache-2.0"
)

AUTHENTIK = OpenSourceAlternative(
    name="Authentik",
    category=ServiceCategory.AUTHENTICATION,
    description="Modern authentication server with focus on flexibility and versatility.",
    website="https://goauthentik.io/",
    github="https://github.com/goauthentik/authentik",
    replaces=["Auth0", "Okta", "AWS Cognito"],
    features=[
        "SAML, OAuth2, OIDC support",
        "LDAP/Active Directory",
        "Social login",
        "Multi-factor authentication",
        "Application proxy",
        "Beautiful UI",
        "Outpost architecture"
    ],
    stars=13000,
    license="MIT"
)

LOGTO = OpenSourceAlternative(
    name="Logto",
    category=ServiceCategory.AUTHENTICATION,
    description="Modern Auth0 alternative for building identity infrastructure.",
    website="https://logto.io/",
    github="https://github.com/logto-io/logto",
    replaces=["Auth0", "Clerk", "WorkOS"],
    features=[
        "OIDC-based authentication",
        "Social sign-in",
        "Passwordless",
        "Multi-factor authentication",
        "User management console",
        "SDKs for all platforms",
        "Machine-to-machine auth"
    ],
    stars=9000,
    license="MPL-2.0"
)

# ============================================================================
# ANALYTICS (Alternatives to Google Analytics, Mixpanel)
# ============================================================================

PLAUSIBLE = OpenSourceAlternative(
    name="Plausible",
    category=ServiceCategory.ANALYTICS,
    description="Privacy-friendly Google Analytics alternative. Simple, lightweight, and GDPR compliant.",
    website="https://plausible.io/",
    github="https://github.com/plausible/analytics",
    replaces=["Google Analytics", "Mixpanel"],
    features=[
        "Privacy-focused",
        "No cookies",
        "GDPR compliant",
        "Lightweight script (<1KB)",
        "Simple dashboard",
        "Goal tracking",
        "UTM parameters",
        "API access"
    ],
    stars=20000,
    license="AGPL-3.0"
)

UMAMI = OpenSourceAlternative(
    name="Umami",
    category=ServiceCategory.ANALYTICS,
    description="Simple, fast, privacy-focused website analytics alternative to Google Analytics.",
    website="https://umami.is/",
    github="https://github.com/umami-software/umami",
    replaces=["Google Analytics"],
    features=[
        "Privacy-focused",
        "No cookies",
        "Lightweight",
        "Real-time data",
        "Custom events",
        "Multiple websites",
        "API access"
    ],
    stars=23000,
    license="MIT"
)

POSTHOG = OpenSourceAlternative(
    name="PostHog",
    category=ServiceCategory.ANALYTICS,
    description="All-in-one product analytics, feature flags, session recordings, A/B testing.",
    website="https://posthog.com/",
    github="https://github.com/PostHog/posthog",
    replaces=["Mixpanel", "Amplitude", "LaunchDarkly", "Hotjar"],
    features=[
        "Product analytics",
        "Session recordings",
        "Feature flags",
        "A/B testing",
        "Funnels",
        "User paths",
        "Heatmaps",
        "Self-hosted or cloud"
    ],
    stars=22000,
    license="MIT"
)

# ============================================================================
# MONITORING (Alternatives to Datadog, New Relic)
# ============================================================================

UPTIME_KUMA = OpenSourceAlternative(
    name="Uptime Kuma",
    category=ServiceCategory.MONITORING,
    description="Fancy self-hosted monitoring tool. Alternative to Uptime Robot, StatusCake.",
    website="https://uptime.kuma.pet/",
    github="https://github.com/louislam/uptime-kuma",
    replaces=["Uptime Robot", "StatusCake", "Pingdom"],
    features=[
        "HTTP(s), TCP, DNS, Docker monitoring",
        "Beautiful status page",
        "Multiple notification channels",
        "Multi-language",
        "Proxy support",
        "2FA",
        "Certificate monitoring"
    ],
    stars=60000,
    license="MIT"
)

GRAFANA = OpenSourceAlternative(
    name="Grafana",
    category=ServiceCategory.MONITORING,
    description="Open source observability platform for metrics, logs, and traces.",
    website="https://grafana.com/",
    github="https://github.com/grafana/grafana",
    replaces=["Datadog", "New Relic", "Splunk"],
    features=[
        "Beautiful dashboards",
        "Multiple data sources",
        "Alerting",
        "Annotations",
        "Plugins ecosystem",
        "Explore mode",
        "Loki for logs",
        "Tempo for traces"
    ],
    stars=65000,
    license="AGPL-3.0"
)

# ============================================================================
# EMAIL (Alternatives to SendGrid, Mailchimp)
# ============================================================================

LISTMONK = OpenSourceAlternative(
    name="Listmonk",
    category=ServiceCategory.EMAIL,
    description="High performance, self-hosted newsletter and mailing list manager.",
    website="https://listmonk.app/",
    github="https://github.com/knadh/listmonk",
    replaces=["Mailchimp", "SendGrid", "Mailerlite"],
    features=[
        "Newsletter management",
        "Mailing lists",
        "Campaign analytics",
        "Media management",
        "Template editor",
        "Multiple SMTP support",
        "Subscriber segmentation",
        "API access"
    ],
    stars=15000,
    license="AGPL-3.0"
)

# ============================================================================
# STORAGE (Alternatives to AWS S3)
# ============================================================================

MINIO = OpenSourceAlternative(
    name="MinIO",
    category=ServiceCategory.STORAGE,
    description="High performance, S3-compatible object storage. The gold standard for self-hosted S3.",
    website="https://min.io/",
    github="https://github.com/minio/minio",
    replaces=["AWS S3", "Google Cloud Storage", "Azure Blob Storage"],
    features=[
        "S3-compatible API",
        "High performance",
        "Kubernetes native",
        "Encryption at rest",
        "Identity management",
        "Bucket versioning",
        "Object locking",
        "Replication"
    ],
    stars=48000,
    license="AGPL-3.0"
)

# ============================================================================
# CI/CD (Alternatives to GitHub Actions, CircleCI)
# ============================================================================

GITEA_ACTIONS = OpenSourceAlternative(
    name="Gitea Actions",
    category=ServiceCategory.CI_CD,
    description="Built-in CI/CD for Gitea, compatible with GitHub Actions syntax.",
    website="https://gitea.io/",
    github="https://github.com/go-gitea/gitea",
    replaces=["GitHub Actions", "GitLab CI"],
    features=[
        "GitHub Actions compatible",
        "Self-hosted runners",
        "Workflow syntax",
        "Artifact handling",
        "Container support"
    ],
    stars=45000,
    license="MIT"
)

WOODPECKER = OpenSourceAlternative(
    name="Woodpecker CI",
    category=ServiceCategory.CI_CD,
    description="Simple yet powerful CI/CD engine with great extensibility.",
    website="https://woodpecker-ci.org/",
    github="https://github.com/woodpecker-ci/woodpecker",
    replaces=["Drone CI", "GitHub Actions", "CircleCI"],
    features=[
        "Docker-based pipelines",
        "Multi-platform support",
        "Matrix builds",
        "Secrets management",
        "Plugin ecosystem",
        "Multiple SCM support"
    ],
    stars=4000,
    license="Apache-2.0"
)

# ============================================================================
# SEARCH (Alternatives to Algolia, Elasticsearch)
# ============================================================================

MEILISEARCH = OpenSourceAlternative(
    name="Meilisearch",
    category=ServiceCategory.SEARCH,
    description="Lightning-fast search engine. Open source alternative to Algolia.",
    website="https://www.meilisearch.com/",
    github="https://github.com/meilisearch/meilisearch",
    replaces=["Algolia", "Elasticsearch"],
    features=[
        "Typo tolerance",
        "Instant search",
        "Faceted search",
        "Geo search",
        "Multi-tenancy",
        "RESTful API",
        "SDKs for all languages"
    ],
    stars=48000,
    license="MIT"
)

TYPESENSE = OpenSourceAlternative(
    name="Typesense",
    category=ServiceCategory.SEARCH,
    description="Fast, typo-tolerant search engine optimized for instant search.",
    website="https://typesense.org/",
    github="https://github.com/typesense/typesense",
    replaces=["Algolia", "Elasticsearch"],
    features=[
        "Typo tolerance",
        "Instant search",
        "Faceted search",
        "Geo search",
        "Vector search",
        "Scoped API keys",
        "High availability"
    ],
    stars=21000,
    license="GPL-3.0"
)


# ============================================================================
# DATABASE OF ALL ALTERNATIVES
# ============================================================================

ALTERNATIVES_DATABASE: Dict[str, OpenSourceAlternative] = {
    # Deployment
    "coolify": COOLIFY,
    "dokku": DOKKU,
    "caprover": CAPROVER,
    "dokploy": DOKPLOY,
    # Backend
    "conduit": CONDUIT,
    "appwrite": APPWRITE,
    "supabase": SUPABASE,
    "pocketbase": POCKETBASE,
    # Database
    "neon": NEON,
    # Authentication
    "keycloak": KEYCLOAK,
    "authentik": AUTHENTIK,
    "logto": LOGTO,
    # Analytics
    "plausible": PLAUSIBLE,
    "umami": UMAMI,
    "posthog": POSTHOG,
    # Monitoring
    "uptime_kuma": UPTIME_KUMA,
    "grafana": GRAFANA,
    # Email
    "listmonk": LISTMONK,
    # Storage
    "minio": MINIO,
    # CI/CD
    "gitea_actions": GITEA_ACTIONS,
    "woodpecker": WOODPECKER,
    # Search
    "meilisearch": MEILISEARCH,
    "typesense": TYPESENSE,
}


# Mapping of paid services to their open source alternatives
PAID_TO_OPEN_SOURCE: Dict[str, List[str]] = {
    # Deployment
    "vercel": ["coolify", "dokploy"],
    "netlify": ["coolify", "dokploy"],
    "heroku": ["coolify", "dokku", "caprover", "dokploy"],
    "github_pages": ["coolify"],
    "railway": ["coolify", "dokku"],
    "render": ["coolify", "dokku"],
    # Backend
    "firebase": ["conduit", "appwrite", "supabase", "pocketbase"],
    "aws_amplify": ["appwrite", "supabase"],
    "parse": ["conduit"],
    # Authentication
    "auth0": ["keycloak", "authentik", "logto"],
    "okta": ["keycloak", "authentik"],
    "clerk": ["logto"],
    "aws_cognito": ["keycloak", "authentik"],
    # Analytics
    "google_analytics": ["plausible", "umami", "posthog"],
    "mixpanel": ["posthog", "plausible"],
    "amplitude": ["posthog"],
    "hotjar": ["posthog"],
    "launchdarkly": ["posthog"],
    # Monitoring
    "uptime_robot": ["uptime_kuma"],
    "pingdom": ["uptime_kuma"],
    "datadog": ["grafana"],
    "new_relic": ["grafana"],
    # Email
    "mailchimp": ["listmonk"],
    "sendgrid": ["listmonk"],
    # Storage
    "aws_s3": ["minio"],
    "google_cloud_storage": ["minio"],
    "azure_blob": ["minio"],
    # CI/CD
    "github_actions": ["gitea_actions", "woodpecker"],
    "circleci": ["woodpecker"],
    # Search
    "algolia": ["meilisearch", "typesense"],
    "elasticsearch": ["meilisearch", "typesense"],
}


class OpenSourceAlternativeFinder:
    """
    Helper class for agents to find open source alternatives to paid services.

    Usage:
        finder = OpenSourceAlternativeFinder()

        # Find alternative to a specific paid service
        alternatives = finder.find_alternative("vercel")

        # Find all alternatives in a category
        deployment_options = finder.get_by_category(ServiceCategory.DEPLOYMENT)

        # Get recommendation
        recommendation = finder.get_recommendation("deployment", "static_site")
    """

    def __init__(self):
        self.database = ALTERNATIVES_DATABASE
        self.mapping = PAID_TO_OPEN_SOURCE

    def find_alternative(self, paid_service: str) -> List[OpenSourceAlternative]:
        """Find open source alternatives to a paid service."""
        paid_key = paid_service.lower().replace(" ", "_").replace("-", "_")

        alternative_keys = self.mapping.get(paid_key, [])
        return [self.database[key] for key in alternative_keys if key in self.database]

    def get_by_category(self, category: ServiceCategory) -> List[OpenSourceAlternative]:
        """Get all alternatives in a specific category."""
        return [alt for alt in self.database.values() if alt.category == category]

    def get_all(self) -> List[OpenSourceAlternative]:
        """Get all open source alternatives."""
        return list(self.database.values())

    def get_recommendation(
        self,
        category: str,
        use_case: str = "general"
    ) -> Optional[OpenSourceAlternative]:
        """
        Get a recommended alternative for a specific use case.

        Args:
            category: The category of service needed (deployment, backend, etc.)
            use_case: Specific use case (static_site, full_stack, api, etc.)

        Returns:
            The recommended OpenSourceAlternative or None
        """
        try:
            cat = ServiceCategory(category.lower())
        except ValueError:
            logger.warning(f"Unknown category: {category}")
            return None

        alternatives = self.get_by_category(cat)
        if not alternatives:
            return None

        # Recommendation logic based on use case
        if cat == ServiceCategory.DEPLOYMENT:
            if use_case in ["static_site", "landing_page"]:
                # Coolify is best for static sites
                return self.database.get("coolify")
            elif use_case in ["full_stack", "backend"]:
                # Dokku for Heroku-style full-stack
                return self.database.get("dokku")
            else:
                # Default to Coolify (most feature-rich)
                return self.database.get("coolify")

        elif cat == ServiceCategory.BACKEND:
            if use_case in ["small", "prototype", "mvp"]:
                # PocketBase for small projects
                return self.database.get("pocketbase")
            elif use_case in ["enterprise", "complex"]:
                # Conduit for complex backends
                return self.database.get("conduit")
            else:
                # Supabase as default (most popular)
                return self.database.get("supabase")

        elif cat == ServiceCategory.AUTHENTICATION:
            if use_case in ["enterprise", "sso"]:
                return self.database.get("keycloak")
            else:
                return self.database.get("logto")

        elif cat == ServiceCategory.ANALYTICS:
            if use_case in ["simple", "privacy"]:
                return self.database.get("plausible")
            else:
                return self.database.get("posthog")

        elif cat == ServiceCategory.MONITORING:
            return self.database.get("uptime_kuma")

        # Default: return first alternative
        return alternatives[0] if alternatives else None

    def search(self, query: str) -> List[OpenSourceAlternative]:
        """Search alternatives by name, description, or features."""
        query_lower = query.lower()
        results = []

        for alt in self.database.values():
            # Check name
            if query_lower in alt.name.lower():
                results.append(alt)
                continue

            # Check description
            if query_lower in alt.description.lower():
                results.append(alt)
                continue

            # Check replaces
            for replaced in alt.replaces:
                if query_lower in replaced.lower():
                    results.append(alt)
                    break

            # Check features
            for feature in alt.features:
                if query_lower in feature.lower():
                    results.append(alt)
                    break

        return results

    def print_recommendation(self, category: str, use_case: str = "general") -> str:
        """Get a formatted recommendation string."""
        rec = self.get_recommendation(category, use_case)
        if not rec:
            return f"No recommendation found for {category}/{use_case}"

        return f"""
## Recommended: {rec.name}

**Description:** {rec.description}

**Website:** {rec.website}
**GitHub:** {rec.github}

**Replaces:** {', '.join(rec.replaces)}

**Key Features:**
{chr(10).join(f'- {f}' for f in rec.features[:5])}

**License:** {rec.license}
"""


# Convenience function for agents
def find_open_source_alternative(paid_service: str) -> List[OpenSourceAlternative]:
    """
    Quick function for agents to find open source alternatives.

    Usage:
        alternatives = find_open_source_alternative("vercel")
        for alt in alternatives:
            print(f"{alt.name}: {alt.website}")
    """
    finder = OpenSourceAlternativeFinder()
    return finder.find_alternative(paid_service)


def get_deployment_recommendation(use_case: str = "static_site") -> OpenSourceAlternative:
    """Get deployment platform recommendation."""
    finder = OpenSourceAlternativeFinder()
    return finder.get_recommendation("deployment", use_case)


def get_backend_recommendation(use_case: str = "general") -> OpenSourceAlternative:
    """Get backend platform recommendation."""
    finder = OpenSourceAlternativeFinder()
    return finder.get_recommendation("backend", use_case)


# Main database reference URL
OPEN_SOURCE_ALTERNATIVES_URL = "https://www.opensourcealternative.to/"


if __name__ == "__main__":
    # Test the module
    finder = OpenSourceAlternativeFinder()

    print("=== Open Source Alternatives Database ===\n")

    # Test finding alternatives to Vercel
    print("Alternatives to Vercel:")
    for alt in finder.find_alternative("vercel"):
        print(f"  - {alt.name}: {alt.website}")

    print("\nAlternatives to Firebase:")
    for alt in finder.find_alternative("firebase"):
        print(f"  - {alt.name}: {alt.website}")

    print("\n" + finder.print_recommendation("deployment", "static_site"))
    print(finder.print_recommendation("backend", "mvp"))
