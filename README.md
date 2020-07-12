# dd-twitter

This project aims to look for correlation between the Twitter Engagement around a company and it's current stock valuation.
By default, the project is scoped to look for $DDOG but tweaked a little, it will work for stocks too.

> NOTE: This project can in no aspect be considered a financial advice. This is stricly for entertainment and educational purposes.
___
## Getting started

### Container: Datadog Agent

1. Deploy the [Docker Agent](https://docs.datadoghq.com/agent/docker/?tab=standard) on your host using the below. Make sure to set the `DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true`.

```
DOCKER_CONTENT_TRUST=1 docker run -d --name datadog-agent \
           -e DD_API_KEY="<DATADOG_API_KEY>" \
           -e DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true \
           -v /var/run/docker.sock:/var/run/docker.sock:ro \
           -v /proc/:/host/proc/:ro \
           -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
           datadog/agent:latest
```
2. Get the IP of the Agent Container using `docker network inspect bridge` under IPV4.
> This will be used to point the dd-twitter container to the Agent.
___
### Container: dd-twitter

3. Checkout the repo with `git clone https://github.com/DanyNarcisse/dd-twitter.git`
4. Create a `credentials.js` file in this directory containing your Twitter API credentials - The file will be copied into the Docker image.

```
module.exports = {
    consumer_key:         'YOUR_CONSUMER_KEY',
    consumer_secret:      'YOUR_CONSUMER_KEY_SECRET',
    access_token:         'YOUR_ACCESS_TOKEN',
    access_token_secret:  'YOUR_ACCESS_TOKEN_SECRET'
}
```
*To get your credentials, head to [Twitter Developer Platform](https://developer.twitter.com/en/docs/basics/getting-started)*

5. Use `docker build -t <your_username>/dd-twitter .` to build the image.
6. Use `docker run -e DD_AGENT_HOST=IPV4_OF_DDAGENT -d <your_username>/dd-twitter` to start the container. Metrics should start flowing into your Datadog Account.

___
## Troubleshoot

- Check that the Datadog Agent is properly running and listening to custom metrics.
> Note: The app uses the deault 8125 port to forward statsd metrics to the Agent.

- Check that the ENV VARS are properly set in both containers and that the dd-twitter container is sending the metrics to the right IP (`DD_AGENT_HOST`).

- Make sure both containers are running under the same network - default: *bridge*