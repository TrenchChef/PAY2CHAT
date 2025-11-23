# X402 Agent System Guide

## Overview

The x402 agent system is a collection of specialized Cursor agents designed to help with development, testing, auditing, and maintenance of the PAY2CHAT application.

## Available Agents

### 1. x402MetaRunner
**Purpose**: Orchestrates all other agents in sequence
**Description**: Automatically executes all x402 agents in sequence: TechAudit → Fixer → SecScan → Refactorer → Finisher.

**Usage**: 
- Run this agent to perform a complete codebase audit and fix cycle
- Best for comprehensive code quality checks before major releases

### 2. x402TechAudit
**Purpose**: Technical audit and dependency analysis
**Description**: Scans entire codebase and outputs full dependency, env var, secret, and system requirement analysis.

**Usage**:
- Run before major updates to identify potential issues
- Use to verify all dependencies are properly declared
- Check for missing environment variables

### 3. x402Fixer
**Purpose**: Automatic fixes for common issues
**Description**: Fixes dependencies, imports, versions, TypeScript config, folder structure, and rebuilds a working codebase.

**Usage**:
- Run after TechAudit to automatically fix identified issues
- Use when encountering build or dependency errors
- Helps maintain codebase consistency

### 4. x402SecScan
**Purpose**: Security scanning
**Description**: Scans for security vulnerabilities, exposed secrets, and security best practices.

**Usage**:
- Run before deploying to production
- Use regularly to check for security issues
- Important for maintaining secure codebase

### 5. x402Refactorer
**Purpose**: Code refactoring
**Description**: Refactors code to improve structure, readability, and maintainability.

**Usage**:
- Run when code needs cleanup
- Use to improve code quality without changing functionality
- Helps maintain clean codebase

### 6. x402Finisher
**Purpose**: Final polish and validation
**Description**: Performs final checks and ensures everything is ready for deployment.

**Usage**:
- Run as final step before deployment
- Use to ensure all quality checks pass
- Validates final state of codebase

### 7. x402Rollback
**Purpose**: Version control and rollback
**Description**: Creates snapshots and allows rollback to previous states.

**Usage**:
- Run before making major changes
- Use to create safety checkpoints
- Allows safe experimentation

### 8. x402ProgressReporter
**Purpose**: Progress tracking
**Description**: Tracks and reports development progress.

**Usage**:
- Automatically tracks progress
- Updates progress logs
- Provides development insights

### 9. x402AgentLogDashboard
**Purpose**: Agent activity dashboard
**Description**: Aggregates outputs from all x402 agents and provides a dashboard view.

**Usage**:
- View all agent outputs in one place
- Track agent activity
- Monitor development progress

## Installation

The agent system is already installed in this repository. To reinstall or update:

```bash
cd x402chat
./install_all.sh
```

This will:
1. Copy all agents to `.cursor/agents/`
2. Install the ruleset to `.cursor/rules/`
3. Create necessary directories
4. Initialize dashboard and progress logs

## Usage Workflow

### Standard Development Cycle

1. **Before Starting Work**
   ```bash
   # Run x402Rollback to create a snapshot
   # (via Cursor agent interface)
   ```

2. **During Development**
   - Use x402TechAudit to check for issues
   - Use x402Fixer to automatically fix common problems
   - Use x402SecScan to check security

3. **Before Committing**
   ```bash
   # Run x402MetaRunner for complete check
   # (via Cursor agent interface)
   ```

4. **Before Deployment**
   ```bash
   # Run x402Finisher for final validation
   # (via Cursor agent interface)
   ```

### Quick Fixes

- **Build Errors**: Run x402Fixer
- **Security Concerns**: Run x402SecScan
- **Code Quality**: Run x402Refactorer
- **Complete Check**: Run x402MetaRunner

## Agent Outputs

All agent outputs are tracked in:
- `x402chat/logs/AGENT_DASHBOARD.md` - Main dashboard
- `x402chat/logs/progress/` - Progress logs
- `x402chat/PROGRESS.md` - Progress summary

## Best Practices

1. **Always create snapshots** before major changes (x402Rollback)
2. **Run audits regularly** to catch issues early (x402TechAudit)
3. **Use MetaRunner** for comprehensive checks before releases
4. **Check dashboard** regularly to monitor agent activity
5. **Fix issues immediately** when identified by agents

## Integration with Development

The agent system integrates seamlessly with:
- Cursor IDE agent interface
- Git workflow (snapshots and rollbacks)
- Build and deployment processes
- Code review workflows

## Troubleshooting

### Agents Not Appearing
- Restart Cursor after installation
- Check `.cursor/agents/` directory exists
- Verify agent JSON files are valid

### Agent Errors
- Check `x402chat/logs/AGENT_DASHBOARD.md` for error details
- Run x402TechAudit to identify issues
- Use x402Rollback to restore previous state

## Next Steps

1. Review `x402chat/logs/AGENT_DASHBOARD.md` for current status
2. Run x402MetaRunner for initial comprehensive check
3. Set up regular agent runs in your workflow
4. Monitor progress via dashboard

---

**Note**: The agent system is designed to assist development but should not replace manual code review and testing.

