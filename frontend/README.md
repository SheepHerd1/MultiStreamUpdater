# Frontend for Multi-Stream Updater

This is a React application created with `create-react-app`.

## Local Development

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Create a `.env.local` file in the `frontend` directory.
4.  Add the URL of your deployed Vercel backend to it:
    ```
    REACT_APP_API_BASE_URL=https://your-project-name.vercel.app
    ```
5.  Start the development server: `npm start`

## Deployment to GitHub Pages

1.  Open `frontend/package.json`.
2.  Add a `homepage` field with the URL where it will be hosted.
    ```json
    "homepage": "https://<your-github-username>.github.io/multi-stream-updater",
    ```
3.  Install the `gh-pages` package:
    ```bash
    npm install gh-pages --save-dev
    ```
4.  Add the following scripts to your `package.json`:
    ```json
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
    ```
5.  Run the deploy script: `npm run deploy`. This will build your app and push it to a `gh-pages` branch on your repository.
6.  Go to your GitHub repository's settings, find the "Pages" section, and set the source to the `gh-pages` branch. Your site will be live at the `homepage` URL.