import { Octokit } from 'octokit';

export const github = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const REPO_OWNER = process.env.GITHUB_REPO.split('/')[0];
export const REPO_NAME = process.env.GITHUB_REPO.split('/')[1];
export const BRANCH = process.env.GITHUB_BRANCH || 'main';

export async function getFile(path) {
    try {
        const { data } = await github.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: path,
            ref: BRANCH
        });
        return {
            sha: data.sha,
            content: Buffer.from(data.content, 'base64').toString('utf8')
        };
    } catch (error) {
        if (error.status === 404) return null;
        throw error;
    }
}

export async function saveFile(path, content, message, sha = null) {
    await github.rest.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: path,
        message: message,
        content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(content).toString('base64'),
        branch: BRANCH,
        sha: sha // Required for updates
    });
}

export async function updateJsonFile(path, callback, commitMessage) {
    const file = await getFile(path);
    if (!file) throw new Error(`File ${path} not found`);

    const data = JSON.parse(file.content);
    const newData = callback(data);

    await saveFile(path, JSON.stringify(newData, null, 2), commitMessage, file.sha);
    return newData;
}

export async function deleteFile(path, message, sha = null) {
    // If SHA not provided, get it first
    if (!sha) {
        const file = await getFile(path);
        if (!file) return; // Already gone
        sha = file.sha;
    }

    await github.rest.repos.deleteFile({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: path,
        message: message,
        branch: BRANCH,
        sha: sha
    });
}

export async function getDirectory(path) {
    try {
        const { data } = await github.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: path,
            ref: BRANCH
        });
        return Array.isArray(data) ? data : [];
    } catch (error) {
        if (error.status === 404) return [];
        throw error;
    }
}
