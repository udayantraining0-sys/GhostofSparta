from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum

router = APIRouter()


class ToolName(str, Enum):
    terminal = "terminal"
    browser = "browser"
    filesystem = "filesystem"
    code_executor = "code_executor"
    search = "search"
    memory_search = "memory_search"
    memory_store = "memory_store"
    git = "git"
    api_call = "api_call"
    calculator = "calculator"


TOOLS_DEFINITIONS = [
    {
        "name": "terminal",
        "description": "Execute shell commands in an isolated sandbox environment",
        "parameters": {
            "command": {"type": "string", "description": "Shell command to execute"},
            "timeout": {"type": "integer", "default": 30, "description": "Timeout in seconds"},
        },
        "requires_sandbox": True,
        "max_runtime_seconds": 120,
    },
    {
        "name": "browser",
        "description": "Control a headless browser for web automation",
        "parameters": {
            "action": {"type": "string", "enum": ["navigate", "click", "type", "screenshot", "extract"]},
            "url": {"type": "string", "description": "Target URL"},
            "selector": {"type": "string", "description": "CSS selector"},
            "text": {"type": "string", "description": "Text to type"},
        },
        "requires_sandbox": True,
        "max_runtime_seconds": 60,
    },
    {
        "name": "filesystem",
        "description": "Read, write, and manage files in the workspace",
        "parameters": {
            "operation": {"type": "string", "enum": ["read", "write", "list", "delete", "mkdir"]},
            "path": {"type": "string"},
            "content": {"type": "string"},
        },
        "requires_sandbox": True,
    },
    {
        "name": "code_executor",
        "description": "Execute code in Python or JavaScript in an isolated runtime",
        "parameters": {
            "language": {"type": "string", "enum": ["python", "javascript", "typescript", "bash"]},
            "code": {"type": "string"},
            "timeout": {"type": "integer", "default": 30},
        },
        "requires_sandbox": True,
        "max_runtime_seconds": 30,
    },
    {
        "name": "search",
        "description": "Search the web for information",
        "parameters": {
            "query": {"type": "string"},
            "max_results": {"type": "integer", "default": 5},
        },
        "requires_sandbox": False,
    },
    {
        "name": "memory_search",
        "description": "Search the long-term memory/vector store",
        "parameters": {
            "query": {"type": "string"},
            "limit": {"type": "integer", "default": 10},
        },
        "requires_sandbox": False,
    },
    {
        "name": "memory_store",
        "description": "Store information in long-term memory",
        "parameters": {
            "content": {"type": "string"},
            "importance": {"type": "number", "default": 0.5},
        },
        "requires_sandbox": False,
    },
    {
        "name": "git",
        "description": "Execute git operations in the workspace",
        "parameters": {
            "command": {"type": "string", "enum": ["status", "diff", "log", "add", "commit", "push", "pull", "branch", "checkout"]},
            "args": {"type": "string", "default": ""},
        },
        "requires_sandbox": True,
    },
    {
        "name": "api_call",
        "description": "Make HTTP API requests",
        "parameters": {
            "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
            "url": {"type": "string"},
            "headers": {"type": "object", "default": {}},
            "body": {"type": "string", "default": ""},
        },
        "requires_sandbox": False,
    },
    {
        "name": "calculator",
        "description": "Perform mathematical calculations",
        "parameters": {
            "expression": {"type": "string"},
        },
        "requires_sandbox": False,
    },
]


class ExecuteToolRequest(BaseModel):
    tool: ToolName
    params: dict[str, Any] = {}


@router.get("")
async def list_tools():
    return TOOLS_DEFINITIONS


@router.get("/{tool_name}/schema")
async def get_tool_schema(tool_name: str):
    for tool in TOOLS_DEFINITIONS:
        if tool["name"] == tool_name:
            return tool
    return None


@router.post("/execute")
async def execute_tool(request: ExecuteToolRequest):
    tool_def = next((t for t in TOOLS_DEFINITIONS if t["name"] == request.tool), None)
    if not tool_def:
        return {"error": f"Unknown tool: {request.tool}"}

    return {
        "tool": request.tool,
        "input": request.params,
        "output": f"Simulated output for {request.tool}",
        "status": "success",
    }
