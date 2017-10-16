
const Raptor = require('raptor-sdk')
const config = require(process.env.CONFIG || './config.default.json')
const log = require('winston')

const raptor = new Raptor(config.raptor)

const loadDevice = (id) => {
    return raptor.Inventory().read(id)
}

const pullData = (device, streamName) => {
    return raptor.Stream().list(device.getStream(streamName), 0, 1000)
}

const printData = (records) => {

    let headerOk = false
    const printHeader = (record) => {
        return 'date\t' + Object.keys(record.channels).join('\t')
    }

    records.forEach((record) => {

        if(!headerOk) {
            console.log(printHeader(record))
            headerOk = true
        }

        const chans = Object.keys(record.channels).map((c) => {
            return record.channels[c]
        }).join('\t')

        console.log('%s\t%s', (new Date(record.timestamp*1000)).toString(), chans)
    })
}

const main = () => {

    if (config.logLevel) {
        log.level = config.logLevel
    }

    const deviceId = process.argv[2]
    if(!deviceId) {
        log.warn('deviceId expected as first argument')
        process.exit(1)
    }
    const streamName = process.argv[3]
    if(!streamName) {
        log.warn('streamName expected as second argument')
        process.exit(1)
    }

    raptor.Auth().login()
        .then((user) => {
            log.debug('Logged in as %s (id=%s)', user.username, user.uuid)
            return loadDevice(deviceId)
        })
        .then((device) => {
            log.debug('Got device `%s`, fetching data for %s', device.id, streamName)
            return pullData(device, streamName)
        })
        .then((records) => {
            log.debug('Got data')
            return printData(records)
        })
        .then(() => {
            log.debug('Closing')
            process.exit(0)
        })
        .catch((e) => {
            log.error('Error: %s', e.message)
            log.debug(e)
        })
}

main()
