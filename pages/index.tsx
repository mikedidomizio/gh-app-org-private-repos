import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { GetServerSidePropsContext } from 'next'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Octokit } from 'octokit'
import { useRouter } from 'next/router'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types'
import Image from 'next/image'

type Context = {
  code?: string
}

type Props = {
  accessToken?: string
  appName: string
  clientId: string
  redirectUrl: string
}

type GitHubListReposResponse =
  RestEndpointMethodTypes['repos']['listForOrg']['response']

type GitHubListInstallationsResponse =
  RestEndpointMethodTypes['apps']['listInstallationsForAuthenticatedUser']['response']

export async function getServerSideProps(
  context: GetServerSidePropsContext<Context>,
) {
  const code = context.query['code']

  const githubAppName = process.env.GITHUB_APP_NAME
  const githubClientId = process.env.GITHUB_ID
  const githubClientSecret = process.env.GITHUB_SECRET
  const githubRedirectUrl = process.env.GITHUB_REDIRECT_URL

  if (
    !githubAppName ||
    !githubClientId ||
    !githubClientSecret ||
    !githubRedirectUrl
  ) {
    throw new Error('Expected env vars not set')
  }

  const baseObject = {
    appName: githubAppName,
    clientId: githubClientId,
    redirectUrl: githubRedirectUrl,
  }

  if (code) {
    const requestData = {
      client_id: githubClientId,
      client_secret: githubClientSecret,
      code,
      redirect_url: githubRedirectUrl,
    }

    const response = await fetch(
      `https://github.com/login/oauth/access_token`,
      {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    )

    const json = await response.json()

    if (!json.error) {
      const { access_token: accessToken } = json

      return {
        props: { accessToken, ...baseObject },
      }
    }
  }

  return {
    props: baseObject,
  }
}

export default function Home({
  accessToken,
  appName,
  clientId,
  redirectUrl,
}: Props) {
  const router = useRouter()
  const { installation_id } = router.query

  const [organizations, setOrganizations] = useState<
    GitHubListInstallationsResponse['data'] | null
  >(null)
  const [repos, setRepos] = useState<GitHubListReposResponse['data']>([])

  useEffect(() => {
    // this occurs when the callback URL from GitHub includes the installation_id, we know we're in a popup and we close ourselves
    if (installation_id) {
      window.close()
    }
  }, [installation_id])

  const fetchInstallations = useCallback(async () => {
    const octokit = new Octokit({ auth: accessToken })

    const response: GitHubListInstallationsResponse =
      await octokit.rest.apps.listInstallationsForAuthenticatedUser({
        // append v to the URL to ensure we fetch fresh data each time
        // this appears to be what Netlify is doing as well
        v: new Date().getTime(),
      })

    setOrganizations(response.data)
  }, [accessToken])

  useEffect(() => {
    if (router.query.code) {
      // the purpose of this is that the code is a one use code
      router.replace('', '', { shallow: true })
    }
  }, [router])

  useEffect(() => {
    if (accessToken) {
      fetchInstallations()
    }
  }, [fetchInstallations, accessToken])

  const handleOrganizationSelectChange = async (
    evt: ChangeEvent<HTMLSelectElement>,
  ) => {
    if (evt.target.value) {
      const octokit = new Octokit({ auth: accessToken })

      const response: GitHubListReposResponse =
        await octokit.rest.repos.listForOrg({
          org: evt.target.value,
          per_page: 100,
          type: 'all',
        })

      setRepos(response.data)
    } else {
      setRepos([])
    }
  }

  const openGitHubInstallWindow = () => {
    const win = window.open(
      `https://github.com/apps/${appName}/installations/new`,
      'popup',
      'toolbar=1,width=800,height=600',
    )

    // we listen for the window to close and then try and refetch the organizations
    // https://stackoverflow.com/a/48240128/3425961
    const timer = setInterval(() => {
      if (win?.closed) {
        clearInterval(timer)
        fetchInstallations()
      }
    }, 1000)
  }

  return (
    <>
      <Head>
        <title>
          Example of flow for GitHub app to access organization&apos;s private
          repositories
        </title>
        <meta
          name="description"
          content="Example of flow for GitHub app to access organization's private repositories"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.mb}>
          Example of flow for GitHub app to access organization&apos;s private
          repositories
        </h1>

        <p className={styles.mb}>
          <a
            href={`https://github.com/login/oauth/authorize?scope=repo&client_id=${clientId}&redirect_uri=${redirectUrl}`}
          >
            Click here to login with GitHub SSO
          </a>
        </p>

        {organizations ? (
          <p className={styles.mb}>
            <select onChange={handleOrganizationSelectChange}>
              <option value="">Choose organization</option>
              {organizations.installations.map((org) => {
                return <option key={org.id}>{org.account?.login}</option>
              })}
            </select>
          </p>
        ) : null}

        {organizations ? (
          <p className={styles.mb}>
            <a
              className={styles.pointer}
              onClick={() => openGitHubInstallWindow()}
              target="_blank"
              rel="noreferrer"
            >
              Don&apos;t see the organization in the dropdown? Click here to
              install the app onto the organization
            </a>
          </p>
        ) : null}

        {repos.length ? (
          <table className={styles.mb}>
            <thead>
              <tr>
                <th>Repository</th>
                <th>Private</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((repo) => {
                return (
                  <tr key={repo.id}>
                    <td>{repo.full_name}</td>
                    <td>{'' + repo.private}</td>
                    <td>{repo.visibility}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : null}

        <p className={styles.mb}>
          <a
            href="https://github.com/mikedidomizio/github-app-organization-private-repos"
            target="_blank"
            rel="noreferrer"
          >
            <Image
              className={styles.githubIcon}
              src="/github-mark-white.svg"
              height={32}
              width={32}
              alt="Octocat"
            />
          </a>
        </p>
      </main>
    </>
  )
}
