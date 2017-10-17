
const Raptor = require('raptor-sdk')
const config = require(process.env.CONFIG || './config.default.json')
const log = require('winston')
const Promise = require('bluebird')

const raptor = new Raptor(config.raptor)

const loadDevice = (id) => {
    return raptor.Inventory().read(id)
}

const pullData = (device, streamName, limit = 0, size = 1000, page = 0) => {
    const results = []
    return raptor.Stream().list(device.getStream(streamName), page, size, 'timestamp')
        .then((pagedResults) => {
            if(pagedResults.length === 0) {
                return Promise.resolve(results)
            }
            results.push(...pagedResults)
            if (limit !== 0 && results.length > limit) {
                const limitedResults = results.slice(0, limit)
                return Promise.resolve(limitedResults)
            }
            log.debug('Fetching page %s, results size %s', page+1, results.length)
            return pullData(device, streamName, limit, size, page+1)
        })
        .then((res) => {
            results.push(...res)
            return Promise.resolve(results)
        })
}

const printData = (records) => {

    const getHeader = (record) => {
        const a = ['date']
        a.push(...Object.keys(record.channels))
        return a
    }

    const data = []
    records.forEach((record, i) => {
        if(i === 0) {
            data.push(getHeader(record).join('\t'))
        }
        const a = [(new Date(record.timestamp*1000)).toString()]
        a.push(...Object.keys(record.channels).map((c) => record.channels[c]))
        data.push(a.join('\t'))
    })

    log.debug('Got %s lines', data.length)
    return data.join('\n') + '\n'
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
    const limit = process.argv[4]

    raptor.Auth().login()
        .then((user) => {
            log.debug('Logged in as %s (id=%s)', user.username, user.uuid)
            return loadDevice(deviceId)
        })
        .then((device) => {
            log.debug('Got device `%s`, fetching data for %s', device.id, streamName)
            return pullData(device, streamName, limit || 0)
        })
        .then((records) => {
            log.debug('Got data')
            return printData(records)
        })
        .then((csv) => {
            return new Promise(function(resolve, reject) {
                var fs = require('fs')
                fs.writeFile(`./data/export-${deviceId}-${streamName}.csv`, csv, function(err) {
                    if(err) {
                        return reject(err)
                    }
                    resolve()
                })
            })
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
