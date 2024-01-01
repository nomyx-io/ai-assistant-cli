cd ../ai-assistant && rm -rf dist && npm run build && npm publish --access public && git add . && git commit -m "publish" && git push
cd ../ai-assistant-tools && rm -rf dist && npm run build && npm publish --access public && git add . && git commit -m "publish" && git push
cd ../ai-assistant-cli && rm -rf dist && npm run build && npm publish --access public && git add . && git commit -m "publish" && git push
