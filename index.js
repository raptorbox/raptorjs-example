
const Raptor = require('raptor-sdk')
const config = require(process.env.CONFIG || './config.default.json')
const log = require('winston')

const code = '0001'

const raptor = new Raptor(config.raptor)

const loadDevice = (code) => {
    log.info('Search device with code %s', code)
    return raptor.Inventory()
        .search({
            properties: {code}
        })
        .then((result) => {
            // found a device
            if (result.length) {
                log.info('Found device %s', result[0].name)
                return Promise.resolve(result[0])
            }

            // create a new device
            log.info('Creating a new example device')

            const device = new Raptor.models.Device()
            device.name = 'Environment monitor'
            device.properties.code = code
            device.setStream({
                'name': 'ambient',
                'channels': {
                    'temperature': 'number',
                    'light': 'number',
                }
            })
            device.setStream({
                'name': 'battery',
                'channels': {
                    'charge': 'number',
                }
            })

            log.debug('Creating device: %j', device.toJSON())

            return raptor.Inventory().create(device)
        })
}

const subscribe = (device) => {
    return raptor.Inventory()
        .subscribe(device, (data) => {
            log.info('Data received: %j', data)
        })
        .then(() => Promise.resolve(device))
}

const pushData = (device) => {
    const record = device.getStream('ambient').createRecord({
        temperature: Math.floor(Math.random()*10),
        light: Math.floor(Math.random()*100)
    })
    return raptor.Stream().push(record)
}

const main = () => {

    log.level = config.logLevel

    raptor.Auth().login()
        .then((user) => {
            log.debug('Logged in as %s (id=%s)', user.username, user.uuid)
            return loadDevice(code)
        })
        .then((device) => {
            log.debug('Got device `%s`, subscribing to events', device.id)
            return subscribe(device)
        })
        .then((device) => {
            log.debug('Pushing data to device `%s`', device.id)
            return pushData(device)
        })
        .catch((e) => {
            log.error('Error: %s', e.message)
        })
}


main()
