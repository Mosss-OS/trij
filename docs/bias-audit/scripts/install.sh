#!/bin/bash
# Script to install Python dependencies for bias audit

echo "Setting up Python virtual environment..."
cd /home/moses/Desktop/trij/docs/bias-audit

# Create virtual environment if it doesn't exist
if [ ! -d "env" ]; then
    python3 -m venv env
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
source env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
echo "Installing requirements from scripts/requirements.txt..."
pip install -r scripts/requirements.txt

echo "Installation complete."