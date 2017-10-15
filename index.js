
const Raptor = require('raptor-sdk')
const config = require(process.env.CONFIG || './config.default.json')
const log = require('winston')

const code = '0001'

const raptor = new Raptor(config.raptor)

const loadDevice = (code) => {
    log.info("Search device with code %s", code)
    return raptor.Inventory().search({
        properties: {code}
    })
        .then((result) => {
            // found a device
            if (result.length) {
                log.info("Found device %s", result[0].name)
                return Promise.resolve(result[0])
            }
            // create a new device
            log.info("Creating a new example device")
            const device = new Raptor.models.Device()
            device.name = 'Environment monitor'
            device.properties.code = code
            device
                .addStream('ambient', {
                    'temperature': 'number',
                    'light': 'number',
                })
                .addStream('battery', {
                    'charge': 'number',
                })
        })
    return raptor.Inventory().create(device)
}

raptor.Auth().login()
    .then((user) => {
        log.debug('Logged in as %s (id=%s)', user.username, user.uuid)
        return loadDevice(code)
    })
    .then((device) => {
        log.debug('Got device %s', device.id)
        return Promise.resolve()
    })
    .catch((e) => {
        log.error(e)
    })
