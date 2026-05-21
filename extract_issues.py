#!/usr/bin/env python3

import re
import sys
import os

def extract_issues(markdown_file):
    with open(markdown_file, 'r') as f:
        content = f.read()
    
    # Find all issue sections
    issue_pattern = r'## Issue #(\d+): ([^\n]+)\n\n\*\*Labels:\*\* ([^\n]+)\n\n### Description\n\n([\s\S]*?)\n\n### Acceptance Criteria\n\n([\s\S]*?)(?:\n\n### Technical Notes|\n\n---|\n\n#|\Z)'
    
    matches = re.findall(issue_pattern, content)
    
    issues = []
    for match in matches:
        issue_number = match[0]
        title = match[1].strip()
        labels_raw = match[2].strip()
        description = match[3].strip()
        acceptance_criteria = match[4].strip()
        
        # Parse labels
        labels = []
        for label in labels_raw.split():
            if label.startswith('`') and label.endswith('`'):
                labels.append(label[1:-1])
        
        # Check for technical notes
        technical_notes_match = re.search(r'### Technical Notes\n\n([\s\S]*?)(?:\n\n### Dependencies|\n\n---|\n\n#|\Z)', content[content.find(match[0]):])
        technical_notes = technical_notes_match.group(1).strip() if technical_notes_match else ""
        
        # Check for dependencies
        dependencies_match = re.search(r'### Dependencies\n\n([\s\S]*?)(?:\n\n---|\n\n#|\Z)', content[content.find(match[0]):])
        dependencies = dependencies_match.group(1).strip() if dependencies_match else ""
        
        # Build issue body
        body = f"""## Description

{description}

## Acceptance Criteria

{acceptance_criteria}
"""
        if technical_notes:
            body += f"""
## Technical Notes

{technical_notes}
"""
        if dependencies:
            body += f"""
## Dependencies

{dependencies}
"""
        
        issues.append({
            'number': issue_number,
            'title': title,
            'labels': labels,
            'body': body.strip()
        })
    
    return issues

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_issues.py <markdown_file>")
        sys.exit(1)
    
    issues = extract_issues(sys.argv[1])
    for issue in issues:
        print(f"Issue #{issue['number']}: {issue['title']}")
        print(f"Labels: {', '.join(issue['labels'])}")
        print("---")