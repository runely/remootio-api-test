# remootio-api-test

This repo is created to test and verify if there exist a connection problem in the Remootio WebSocket.

The problem seems to occur when a connection to the Remootio WebSocket has been established and used over several days.

## Setup

This repo is to be run on >= Node.js 22.

The webhooks used to inform of error messages, state changes and when disconnect occurs, is webhooks created in Homey.

### Webhooks

#### ERROR_MESSAGE_WEBHOOK

1. Go to https://my.homey.app/ and create a new flow (standard or advanced)
2. Use the When flow card: Logic -> `Event has been received
   1. Set the `Event` tag to **remootioError** and copy the url from the information icon on the flow card
3. Use the Push notification as the Then flow card to notify yourself that an error message has occured. You can reference the `Tag` in the message to show the error message sent from this test API

#### STATE_CHANGE_WEBHOOK

1. Go to https://my.homey.app/ and create a new flow (standard or advanced)
2. Use the When flow card: Logic -> `Event has been received
    1. Set the `Event` tag to **remootioError** and copy the url from the information icon on the flow card
3. Use the Push notification as the Then flow card to notify yourself that a state change has occured. You can reference the `Tag` in the message to show the state change sent from this test API

#### DISCONNECT_WEBHOOK

1. Go to https://my.homey.app/ and create a new flow (standard or advanced)
2. Use the When flow card: Logic -> `Event has been received
    1. Set the `Event` tag to **remootioError** and copy the url from the information icon on the flow card
3. Use the Push notification as the Then flow card to notify yourself that a disconnect has occured. You can reference the `Tag` in the message to show the disconnect message sent from this test API

### WebSocket API

Configure the WebSocket API on the Remootio device. You need the `IP address`, `Secret Key` and the `Auth Key`

### .env

Create a `.env` file in the root folder with the following content:
```text
IP_ADDRESS='Ip address to the Remootio device. Found when setting up WebSocket API'
API_SECRET_KEY='Secret key to the Remootio device. Found when setting up WebSocket API'
API_AUTH_KEY='Auth key to the Remootio device. Found when setting up WebSocket API'
ERROR_MESSAGE_WEBHOOK='Error message webhook url. Example: https://webhook.homey.app/homey_uid/remootioError?tag=%errorMessage%'
DISCONNECT_WEBHOOK='Disconnect webhook url. Example: https://webhook.homey.app/homey_uid/remootioDisconnect?tag=Disconnected'
STATE_CHANGE_WEBHOOK='State change webhook url. Example: https://webhook.homey.app/homey_uid/stateChange?tag=%remootioStatus%'
```

> [!IMPORTANT]
> It's important to use `%errorMessage%` as the tag for the ERROR_MESSAGE_WEBHOOK<br />
> It's important to use `%Disconnected%` as the tag for the DISCONNECT_WEBHOOK<br />
> It's important to use `%remootioStatus%` as the tag for the STATE_CHANGE_WEBHOOK

## Running

```bash
npm i
npm run build
npm run start
```