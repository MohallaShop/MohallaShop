"""Structured logging configuration (structlog).

Configures structlog to emit JSON in staging/production and pretty, colored
console output in development. Standard library logging is bridged so that
libraries (uvicorn, sqlalchemy) flow through the same processors.
"""

from __future__ import annotations

import logging
import sys
from typing import cast

import structlog
from structlog.stdlib import BoundLogger
from structlog.types import Processor

from app.core.config import Settings


def configure_logging(settings: Settings) -> None:
    """Configure structured logging for the whole process."""
    level = settings.log_level

    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt='iso'),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: Processor
    if settings.is_production or settings.app_env == 'staging':
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level_to_int(level)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Bridge stdlib logging → structlog so uvicorn/sqlalchemy logs are unified.
    logging.basicConfig(
        format='%(message)s',
        stream=sys.stdout,
        level=level_to_int(level),
        force=True,
    )

    for noisy in ('uvicorn', 'uvicorn.error', 'uvicorn.access', 'sqlalchemy.engine'):
        logging.getLogger(noisy).handlers = []
        logging.getLogger(noisy).propagate = True


def level_to_int(level: str) -> int:
    mapping = {
        'CRITICAL': logging.CRITICAL,
        'ERROR': logging.ERROR,
        'WARNING': logging.WARNING,
        'INFO': logging.INFO,
        'DEBUG': logging.DEBUG,
    }
    return mapping.get(level.upper(), logging.INFO)


def get_logger(name: str | None = None) -> BoundLogger:
    """Return a bound structured logger."""
    return cast(BoundLogger, structlog.get_logger(name))
