import _ from 'lodash'
import { Mutators } from './jsonFriendlyMutators'
import helpers, { escapeHtml, TabulatorFormatterParams } from './tabulator'
export const NULL = '(NULL)'
import {CellComponent} from 'tabulator-tables'

export function buildNullValue(text: string) {
  return `<span class="null-value">(${escapeHtml(text)})</span>`
}


export function emptyResult(value: any) {
  if (_.isNil(value)) {
    return buildNullValue('NULL')
  }
  if (_.isString(value) && _.isEmpty(value)) {
    return buildNullValue('EMPTY')
  }
  if (_.isArray(value) && value.length === 0) {
    return buildNullValue('NULL')
  }

  return null
}

export function buildFormatterWithTooltip(cellValue: string, tooltip: string, icon?: string) {
  if (!icon) {
    return `<div class="cell-link-wrapper" title="${escapeHtml(tooltip)}">${escapeHtml(cellValue)}</div>`
  }

  return `<div class="cell-link-wrapper">${escapeHtml(cellValue)}<i class="material-icons fk-link" title="${escapeHtml(tooltip)}">${escapeHtml(icon)}</i></div>`
}

export default {

  methods: {
    niceString: helpers.niceString,
    pillFormatter(cell: CellComponent) {
      const nullValue = emptyResult(cell.getValue())
      if (nullValue) {
        return ''
      }

      const cellValue = cell.getValue()
      return cellValue.map(cv => `<span class="mapper-pill">${cv}</span>`).join('')
    },
    cellTooltip(_event, cell: CellComponent) {
      const params: TabulatorFormatterParams = cell.getColumn().getDefinition().formatterParams || {}
      const binaryEncoding = params.binaryEncoding
      let cellValue = cell.getValue()
      if (cellValue instanceof Uint8Array) {
        cellValue = `${_.truncate(this.niceString(cellValue, false, binaryEncoding), { length: 15 })} (as ${binaryEncoding} string)`
      } else if (
        !params?.fk &&
        !params?.isPK &&
        _.isInteger(Number(cellValue))
      ) {
        try {
          cellValue += ` (${new Date(Number(cellValue)).toISOString()} in unixtime)`
        } catch (e) {
          console.error(`${cellValue} cannot be converted to a date`)
        }
      }
      const nullValue = emptyResult(cellValue)
      return nullValue ? nullValue : escapeHtml(this.niceString(cellValue, true))
    },
    cellFormatter(
      cell: CellComponent,
      params: { fk?: any[], isPK?: boolean, fkOnClick?: (value: any, field: string, cell: CellComponent) => void, binaryEncoding?: 'hex' | 'base64' } = {},
      onRendered: (func: () => void) => void
    ) {
      const classNames = []
      let htmlPrefix = ''
      let cellValue = cell.getValue()

      if (cellValue instanceof Uint8Array) {
        classNames.push('binary-type')
      }

      const nullValue = emptyResult(cellValue)
      if (nullValue) {
        return nullValue
      }
      cellValue = this.niceString(cellValue, true, params.binaryEncoding)
      cellValue = cellValue.replace(/\n/g, ' ↩ ');

      // removing the <pre> will break selection / copy paste, see ResultTable
      let result = `<pre>${escapeHtml(cellValue)}</pre>`
      let tooltip = ''

      if (params?.fk) {
        // FIXME do something so we can do this tooltip
        // if (params.fk.length === 1) tooltip = `View record in ${params.fk[0].toTable}`
        // else tooltip = `View records in ${(params.fk.map(item => item.toTable).join(', ') as string).replace(/, (?![\s\S]*, )/, ', or ')}`
        tooltip = ""

        const withGotoButton = !!params.fkOnClick
        result = buildFormatterWithTooltip(cellValue, tooltip, withGotoButton ? 'launch' : undefined)

        if (withGotoButton) {
          onRendered(() => {
            const fkLink = cell.getElement().querySelector('.fk-link') as HTMLElement
            fkLink.onclick = (e) => params.fkOnClick(cell.getValue(), cell.getField(), cell);
          })
        }
      }

      cell.getElement().classList.add(...classNames)

      return htmlPrefix + result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
