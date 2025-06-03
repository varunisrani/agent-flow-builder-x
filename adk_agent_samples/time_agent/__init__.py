"""Time Agent Package."""
from .agent import root_agent

# Explicitly expose root_agent at the package level
root_agent = root_agent

__all__ = ['root_agent'] 