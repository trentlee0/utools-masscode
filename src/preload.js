const {clipboard} = require('electron')

function request({url, method, body}) {
  return new Promise((resolve, reject) => {
    let ajax = new XMLHttpRequest()
    ajax.open(method, url, true)
    if (method.toUpperCase() === 'POST') {
      ajax.setRequestHeader('Content-Type', 'application/json')
      ajax.send(JSON.stringify(body))
    } else {
      ajax.send()
    }
    ajax.onreadystatechange = () => {
      if (ajax.readyState != 4) return
      if (ajax.status == 200) {
        resolve({data: JSON.parse(ajax.responseText)})
      } else {
        reject({status: ajax.status})
      }
    }
  })
}

const separator = '::'
let setList = []

window.exports = {
  'masscode-search': {
    mode: 'list',
    args: {
      enter: ({code, type, payload}, callbackSetList) => {
        setList = []
        request({
          url: 'http://localhost:3033/snippets/embed-folder',
          method: 'GET'
        })
          .then(({data}) => {
            setList = data
              .filter((i) => !i.isDeleted)
              .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
              .reduce((list, snippet) => {
                const fragments = snippet.content.map((fragment) => {
                  const title =
                    snippet.content.length >= 2
                      ? `${snippet.name} ${separator} ${fragment.label}`
                      : snippet.name || 'Untitled snippet'
                  const description = `${fragment.language} • ${
                    snippet.folder?.name || 'Inbox'
                  }`
                  return {
                    title,
                    description,
                    content: fragment.value
                  }
                })

                list.push(...fragments)
                return list
              }, [])
            callbackSetList(setList)
          })
          .catch((err) => utools.showNotification('massCode 没有在运行！'))
      },
      search: (action, searchWord, callbackSetList) => {
        searchWord = searchWord.toLowerCase()
        callbackSetList(
          setList.filter(
            ({title, description}) =>
              title.toLowerCase().indexOf(searchWord) !== -1 ||
              description.toLowerCase().indexOf(searchWord) !== -1
          )
        )
      },
      select: (action, itemData, callbackSetList) => {
        utools.copyText(itemData.content)
        if (utools.isMacOS()) {
          utools.simulateKeyboardTap('v', 'command')
        } else {
          utools.simulateKeyboardTap('v', 'ctrl')
        }
        utools.hideMainWindow()
        utools.outPlugin()
      },
      placeholder: '搜索'
    }
  },
  'masscode-create': {
    mode: 'list',
    args: {
      enter: ({code, type, payload}, callbackSetList) => {
        callbackSetList([
          {title: '创建片段', description: '使用当前剪贴板内容创建'}
        ])
      },
      search: (action, searchWord, callbackSetList) => {
        callbackSetList([
          {title: '创建片段', description: '使用当前剪贴板内容创建', searchWord}
        ])
      },
      select: (action, itemData, callbackSetList) => {
        const name = itemData.searchWord
        if (!name) return
        request({
          url: 'http://localhost:3033/snippets/create',
          method: 'POST',
          body: {
            name,
            content: [
              {
                label: 'Fragment 1',
                value: clipboard.readText(),
                language: 'plain_text'
              }
            ]
          }
        }).catch((err) => utools.showNotification('massCode 没有在运行！'))
        utools.hideMainWindow()
        utools.outPlugin()
      },
      placeholder: '输入片段名称'
    }
  }
}
