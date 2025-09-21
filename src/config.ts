export const config = {
  ipAddress: process.env.IP_ADDRESS,
  apiSecretKey: process.env.API_SECRET_KEY,
  apiAuthKey: process.env.API_AUTH_KEY,
  webhooks: {
    errorMessage: process.env.ERROR_MESSAGE_WEBHOOK,
    disconnect: process.env.DISCONNECT_WEBHOOK,
    stateChange: process.env.STATE_CHANGE_WEBHOOK
  }
}