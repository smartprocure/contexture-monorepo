import _ from 'lodash/fp.js'
import moment from 'moment-timezone'
import datemath from '@elastic/datemath'

export let parseAndShift = (exp, timezone) => {
  let computed = datemath.parse(exp)
  // Replace the server timezone with the user's timezone if the expression
  // is relative to the start of a day, month, year, etc.
  return /\//.test(exp) ? moment(computed).tz(timezone, true) : computed
}

export let getStartOfQuarter = (quarterOffset, timezone) => {
  let quarter = moment().tz(timezone).quarter() + quarterOffset
  return moment().tz(timezone).quarter(quarter).startOf('quarter')
}

export let getEndOfQuarter = (date) =>
  moment(date).add(1, 'Q').subtract(1, 'ms')

export let getDateIfValid = (x) =>
  moment.utc(new Date(x)).isValid() && moment.utc(new Date(x)).toISOString()

let quarterToOffset = {
  thisCalendarQuarter: 0,
  lastCalendarQuarter: -1,
  nextCalendarQuarter: 1,
}

// https://www.elastic.co/guide/en/elasticsearch/reference/7.x/common-options.html#date-math
export let rangeToDatemath = {
  last1Hour: { from: 'now-1h', to: 'now' },
  last1Day: { from: 'now-1d', to: 'now' },
  last3Days: { from: 'now-3d', to: 'now' },
  last7Days: { from: 'now-7d', to: 'now' },
  last30Days: { from: 'now-30d', to: 'now' },
  last90Days: { from: 'now-90d', to: 'now' },
  last180Days: { from: 'now-180d', to: 'now' },
  last12Months: { from: 'now/d-12M', to: 'now/d' },
  last15Months: { from: 'now/d-15M', to: 'now/d' },
  last18Months: { from: 'now/d-18M', to: 'now/d' },
  last24Months: { from: 'now/d-24M', to: 'now/d' },
  last36Months: { from: 'now/d-36M', to: 'now/d' },
  last48Months: { from: 'now/d-48M', to: 'now/d' },
  last60Months: { from: 'now/d-60M', to: 'now/d' },
  lastCalendarMonth: { from: 'now-1M/M', to: 'now/M-1ms' },
  lastCalendarYear: { from: 'now-1y/y', to: 'now/y-1ms' },
  thisCalendarMonth: { from: 'now/M', to: 'now+1M/M-1ms' },
  thisCalendarYear: { from: 'now/y', to: 'now+1y/y-1ms' },
  nextCalendarMonth: { from: 'now+1M/M', to: 'now+2M/M-1ms' },
  nextCalendarYear: { from: 'now+1y/y', to: 'now+2y/y-1ms' },
  next30Days: { from: 'now/d', to: 'now/d+30d-1ms' },
  next60Days: { from: 'now/d', to: 'now/d+60d-1ms' },
  next90Days: { from: 'now/d', to: 'now/d+90d-1ms' },
  next6Months: { from: 'now/d', to: 'now/d+6M-1ms' },
  next12Months: { from: 'now/d', to: 'now/d+12M-1ms' },
  next18Months: { from: 'now/d', to: 'now/d+18M-1ms' },
  next24Months: { from: 'now/d', to: 'now/d+24M-1ms' },
  next36Months: { from: 'now/d', to: 'now/d+36M-1ms' },
  allPastDates: { from: '', to: 'now/d-1ms' },
  allFutureDates: { from: 'now/d', to: '' },
}

export let rollingRangeToDates = (range, timezone) => {
  if (_.has(range, quarterToOffset)) {
    let from = getStartOfQuarter(quarterToOffset[range], timezone)
    let to = getEndOfQuarter(from)
    return { from, to }
  } else {
    let expressions = rangeToDatemath[range]
    let from = parseAndShift(expressions.from, timezone)
    let to = parseAndShift(expressions.to, timezone)
    return { from, to }
  }
}
