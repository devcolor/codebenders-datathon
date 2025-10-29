#!/usr/bin/env python3
"""
Script to create GitHub issues from hackathon_github_issues.md
Usage: python create_issues.py [--dry-run]
"""

import re
import subprocess
import sys
import json
from pathlib import Path


def check_gh_cli():
    """Check if GitHub CLI is installed and authenticated."""
    try:
        subprocess.run(["gh", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: GitHub CLI (gh) is not installed.")
        print("Install it from: https://cli.github.com/")
        sys.exit(1)
    
    try:
        subprocess.run(["gh", "auth", "status"], capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("❌ Error: Not authenticated with GitHub CLI.")
        print("Run: gh auth login")
        sys.exit(1)


def get_existing_labels():
    """Get list of existing labels in the repository."""
    try:
        result = subprocess.run(
            ["gh", "label", "list", "--json", "name"],
            capture_output=True,
            text=True,
            check=True
        )
        labels_data = json.loads(result.stdout)
        return {label['name'] for label in labels_data}
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return set()


def create_label(label_name, color=None, description=None):
    """Create a label in the repository."""
    # Define colors and descriptions for different label types
    label_configs = {
        'priority:P0': {'color': 'd73a4a', 'description': 'Must-Have - Critical for MVP'},
        'priority:P1': {'color': 'fbca04', 'description': 'Nice-to-Have - Important but not blocking'},
        'priority:P2': {'color': '0e8a16', 'description': 'Stretch - If time permits'},
        'area:data': {'color': '1d76db', 'description': 'Data schema, ETL, validation'},
        'area:backend': {'color': '5319e7', 'description': 'Backend services, APIs'},
        'area:frontend': {'color': 'e99695', 'description': 'UI, React components'},
        'area:ai': {'color': 'f9d0c4', 'description': 'AI/ML, NLQ features'},
        'area:ml': {'color': 'c5def5', 'description': 'Machine Learning models'},
        'area:platform': {'color': 'bfd4f2', 'description': 'Infrastructure, ops, platform'},
        'area:security': {'color': 'd4c5f9', 'description': 'Auth, security, compliance'},
        'area:compliance': {'color': 'd4c5f9', 'description': 'FERPA, PII, compliance'},
        'area:docs': {'color': 'c2e0c6', 'description': 'Documentation'},
        'area:devex': {'color': '7057ff', 'description': 'Developer experience'},
        'area:integration': {'color': 'bfdadc', 'description': 'External integrations'},
        'type:feature': {'color': 'a2eeef', 'description': 'New feature'},
        'type:chore': {'color': 'fef2c0', 'description': 'Maintenance, chores'},
        'type:documentation': {'color': '0075ca', 'description': 'Documentation improvements'},
        'type:tooling': {'color': 'e4e669', 'description': 'Developer tooling'},
        'type:spike': {'color': 'cc317c', 'description': 'Research, investigation'},
        'hackathon': {'color': 'ff6b6b', 'description': '24-hour hackathon task'},
        'mvp': {'color': 'ff6347', 'description': 'MVP - Minimum Viable Product'},
        'etl': {'color': '006b75', 'description': 'ETL pipeline'},
        'api': {'color': '0052cc', 'description': 'API related'},
        'ui': {'color': 'fc9803', 'description': 'User interface'},
        'nlq': {'color': 'f3ccff', 'description': 'Natural language query'},
        'ops': {'color': '0e8a16', 'description': 'Operations'},
        'export': {'color': 'c2e0c6', 'description': 'Export functionality'},
    }
    
    config = label_configs.get(label_name, {})
    color = config.get('color', 'ededed')
    description = config.get('description', '')
    
    cmd = ['gh', 'label', 'create', label_name, '--color', color]
    if description:
        cmd.extend(['--description', description])
    
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def ensure_labels_exist(all_labels, dry_run=False):
    """Ensure all required labels exist in the repository."""
    if dry_run:
        return
    
    print("🏷️  Checking and creating labels...")
    existing_labels = get_existing_labels()
    missing_labels = all_labels - existing_labels
    
    if not missing_labels:
        print(f"   ✅ All {len(all_labels)} labels already exist\n")
        return
    
    print(f"   📝 Creating {len(missing_labels)} missing labels...")
    for label in sorted(missing_labels):
        if create_label(label):
            print(f"      ✅ Created: {label}")
        else:
            print(f"      ⚠️  Could not create: {label}")
    print()


def parse_issues(file_path):
    """Parse issues from the markdown file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Split by --- delimiter
    blocks = content.split('\n---\n')
    
    issues = []
    for block in blocks[1:]:  # Skip the header/intro section
        if not block.strip():
            continue
            
        issue = {}
        lines = block.split('\n')
        
        in_body = False
        body_lines = []
        
        for line in lines:
            if line.startswith('Title: '):
                issue['title'] = line[7:].strip()
            elif line.startswith('Labels: '):
                # Parse JSON array of labels
                labels_str = line[8:].strip()
                try:
                    issue['labels'] = json.loads(labels_str)
                except json.JSONDecodeError:
                    issue['labels'] = []
            elif line.startswith('Estimate: '):
                issue['estimate'] = line[10:].strip()
            elif line.startswith('Body:'):
                in_body = True
            elif in_body:
                # Remove leading indentation (2 spaces)
                if line.startswith('  '):
                    body_lines.append(line[2:])
                elif line:
                    body_lines.append(line)
        
        if 'title' in issue and body_lines:
            # Construct body with estimate
            body = '\n'.join(body_lines)
            if 'estimate' in issue:
                body = f"**⏱️ Estimate:** {issue['estimate']}\n\n{body}"
            issue['body'] = body
            issues.append(issue)
    
    return issues


def create_issue(issue, dry_run=False):
    """Create a GitHub issue using gh CLI."""
    title = issue['title']
    body = issue['body']
    labels = issue.get('labels', [])
    
    cmd = ['gh', 'issue', 'create', '--title', title, '--body', body]
    
    # Add labels
    for label in labels:
        cmd.extend(['--label', label])
    
    if dry_run:
        print(f"📋 Would create: {title}")
        print(f"   Labels: {', '.join(labels)}")
        print()
        return True
    else:
        print(f"🔨 Creating: {title}")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            issue_url = result.stdout.strip()
            print(f"   ✅ Created: {issue_url}")
            print()
            return True
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Failed: {e.stderr}")
            print()
            return False


def main():
    """Main function."""
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE - No issues will be created\n")
    else:
        print("🚀 Creating GitHub issues from hackathon_github_issues.md...\n")
        check_gh_cli()
    
    issues_file = Path(__file__).parent / 'hackathon_github_issues.md'
    
    if not issues_file.exists():
        print(f"❌ Error: {issues_file} not found")
        sys.exit(1)
    
    issues = parse_issues(issues_file)
    
    print(f"📊 Found {len(issues)} issues to create\n")
    
    # Collect all unique labels
    all_labels = set()
    for issue in issues:
        all_labels.update(issue.get('labels', []))
    
    # Ensure labels exist before creating issues
    if not dry_run:
        ensure_labels_exist(all_labels, dry_run)
        
        confirm = input("Continue with issue creation? [y/N]: ")
        if confirm.lower() != 'y':
            print("Cancelled.")
            sys.exit(0)
        print()
    
    success_count = 0
    for issue in issues:
        if create_issue(issue, dry_run):
            success_count += 1
    
    print(f"✅ Successfully processed {success_count}/{len(issues)} issues!")
    
    if dry_run:
        print("\nTo create these issues, run without --dry-run flag:")
        print("  python create_issues.py")


if __name__ == '__main__':
    main()

