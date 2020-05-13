const { htm, withUiHook } = require("@zeit/integration-utils");
const { parse } = require("url");
const { SEMATEXT_HOSTS } = require("../lib/constants");
const getLogDrains = require("../lib/get-log-drains");
const getProject = require("../lib/get-project");
const setup = require("../lib/setup");
const detectRegion = require("../lib/detect-region");

module.exports = withUiHook(async ({ payload }) => {
  const {
    action,
    clientState,
    configurationId,
    project,
    team,
    teamId,
    token,
    user
  } = payload;

  console.log("getting log drains");
  const drains = await getLogDrains({ teamId, token });
  let drain = drains.find(d => d.configurationId === configurationId);
  let errorMessage;

  if (!drain) {
    if (action === "setup") {
      ({ drain, errorMessage } = await setup({
        clientState,
        configurationId,
        project,
        teamId,
        token
      }));
    }
  }

  if (!drain) {
    return htm`
      <Page>
        <Fieldset>
          <FsContent>
            <H2>Project Filtering</H2>
            <P>Subscribe logs of a project only (optional)</P>
            <ProjectSwitcher message="Select a project" />
          </FsContent>
        </Fieldset>
        <Fieldset>
          <FsContent>
            <H2>Create Your Sematext Cloud Account</H2>
            <P>Visit <Link href="https://apps.sematext.com/ui/registration" target="_blank">Sematext Cloud</Link> and create an account.</P>
          </FsContent>
          <FsFooter>
            If you already have an account, you can use that account instead.
          </FsFooter>
        </Fieldset>
        <Fieldset>
          <FsContent>
            <H2>Setup a Logs App</H2>
            <P>Follow the <Link href="https://sematext.com/docs/logs/quick-start/" target="_blank">documentation</Link> to create a Logs App for your organization.</P>
          </FsContent>
        </Fieldset>
        <Fieldset>
          <FsContent>
            <H2>Log Drain URL</H2>
            <P>This is the Log Drain URL you just provisioned.</P>
            <Input name="url" value=${clientState.url ||
              ""} maxWidth="500px" width="100%" />
          </FsContent>
        </Fieldset>
        ${
          errorMessage ? htm`<Notice type="error">${errorMessage}</Notice>` : ""
        }
        <Button action="setup">Setup</Button>
      </Page>
    `;
  }

  let projectForDrain = null;
  if (drain.projectId) {
    try {
      projectForDrain = await getProject(
        { token, teamId },
        { projectId: drain.projectId }
      );
    } catch (err) {
      if (!err.res || err.res.status !== 404) {
        throw err;
      }
    }
  }

  const { hostname, pathname } = parse(drain.url);
  const logsToken = pathname.split("/").pop();
  const region = detectRegion(hostname);
  return htm`
    <Page>
      ${
        drain.projectId && !projectForDrain
          ? htm`<Notice type="warn">The project to be filtered does not exist anymore (ID: ${drain.projectId})</Notice>`
          : ""
      }
      <P>Your logs are being forwarded to this URL and token available in your account.</P>
      <Fieldset>
        <FsContent>
          <Box alignItems="center" display="flex" margin="20px 0" justifyContent="center">
            <H2>${"*".repeat(logsToken.length - 4) + logsToken.slice(-4)}</H2>
          </Box>
        </FsContent>
        <FsFooter>
          <Box display="flex" flex="0 0 100%" justifyContent="space-between">
            <P><Link href=${`https://apps.${SEMATEXT_HOSTS[region]}/ui/logs`} target="_blank">View logs on Sematext Cloud (${region.toUpperCase()})</Link></P>
            ${
              projectForDrain
                ? htm`<P>Filtering for the project <Link href=${`https://zeit.co/${encodeURIComponent(
                    team ? team.slug : user.username
                  )}/${encodeURIComponent(projectForDrain.name)}`}><B>${
                    projectForDrain.name
                  }</B></Link></P>`
                : ""
            }
          </Box>
        </FsFooter>
      </Fieldset>
    </Page>
  `;
});
