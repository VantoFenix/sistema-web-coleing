#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Building React Frontend..."
cd front-cip
npm install
npm run build
cd ..

echo ">>> Installing Python Backend Dependencies..."
cd back-cip
pip install -r requirements.txt

echo ">>> Copying React Build to Django Staticfiles..."
mkdir -p staticfiles/dist
cp -r ../front-cip/dist/* staticfiles/dist/

echo ">>> Running Django collectstatic..."
python manage.py collectstatic --no-input

echo ">>> Deployment Build Finished Successfully!"
