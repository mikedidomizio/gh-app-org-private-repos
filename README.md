# GitHub App Organization Private Repo

The purpose of this repository is to show a simple example of how to use a GitHub app to access an organization's private repositories.

I found this was a bit tricky to understand and I'm hoping this makes it simpler for others in the future (including myself 😅). 

It is done using NextJS and follows a similar flow to how [Netlify](netlify.com) fetches organization repositories.  Whether you are using React or not, I hope this helps you
to understand how to do this.

This is a simple demonstration with React and although there are QOL improvements that could be done with this, it's made to be simple and one component.  

## Quick start

This quick start assumes you have a GitHub organization you are part of that has private (or public) repositories.

- Create a new [GitHub application in GitHub](https://github.com/settings/apps/new)

The following settings are expected:

- `GitHub App name` is the app name that users will see when installing this application.  For demo purposes it's not really important and can be changed later.
- `Homepage URL` can be anything, for this demo we will use `http://localhost:3000`.
- `Callback URL` will be `http://localhost:3000`.  This is for demo purposes and in a production environment would redirect to your production website.
- `Setup URL (optional)` will be `http://localhost:3000`.  The purpose of this is for our demo we will redirect back after install, and close the window.  In a real environment you may not want this.
- `Redirect on update` should be checked ✔.
- `Active` checkbox under `Webhook` can be unchecked.
- Under `Permissions`, `Repository permissions` find the entry for `Metadata`.  To the right of it should be a dropdown, open it and set it to `Read-only`.
- Under `Where can this GitHub App be installed?` select `Any account`.

Click `Create GitHub App` button at the bottom

You should have a new GitHub app now!

At the top of this page is a Client ID

![GitHub Client Id](./docs/github-client.png)

This is used by GitHub to know which application you're talking about when redirecting to GitHub.
Below this should be a button to `Generate a new client secret`

A secret should be generated.  This secret is used to fetch an access token from GitHub after redirection.

⚠ The secret is a secret, and should be stored properly.

We are almost done.  In your terminal run the following commands:

```shell
$ git clone https://github.com/mikedidomizio/github-app-organization-private-repos
$ cd ./github-app-organization-private-repos
$ npm install
$ export GITHUB_ID= ... # this is the GitHub ID of the application
$ export GITHUB_SECRET= ... # this is the secret of the application
$ export GITHUB_APP_NAME= ... # this is the app name that can be retrieved under `Public link` on the app page after the final forward slash
$ export GITHUB_REDIRECT_URL=http://localhost:3000 # demo purposes
# npm run dev
```

Once the Next server has started, go to http://localhost:3000.

Congratulations your GitHub application can authenticate you and access an organization's private repositories.

### How it works

- First the user is to be authenticated (OAuth).
- The user is returned to the local server with an access code.
- This access code is exchanged for a token.
- This token fetches the organizations that the user has granted the application privilege to.
- If the user clicks the "find organization" button, a new window is opened where the user chooses the GitHub organization and approves.
- One the user approves, the window redirects back to the local server
- The new window once redirected back is looking for `installation_id` on mount, and if it sees it, closes that window.
- The main tab in your browser realizes the new window has closed and proceeds to again fetch organizations.

As stated near the top, this is very similar to how [Netlify](netlify.com) does it.
