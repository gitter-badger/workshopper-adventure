const i18n       = require('i18n-core')
    , i18nFs     = require('i18n-core/lookup/fs')
    , i18nObject = require('i18n-core/lookup/object')
    , i18nChain  = require('i18n-core/lookup/chain')
    , i18nExtend = require('i18n-core/lookup/extend')
    , path       = require('path')
    , error      = require('./lib/print').error
    , fs         = require('fs')
    , UNDERLINE  = 'Underline'
    , chalk      = require('chalk')
    , util       = require('./util')

function commandify (s) {
    return String(s).toLowerCase().replace(/\s+/g, '-');
}

function chooseLang (globalStorage, appStorage, defaultLang, availableLangs, lang) {
  if (!!lang && typeof lang != 'string')
    return error('Please supply a language. Available languages are: ' + availableLangs.join(', '))

  if (lang)
    lang = lang.replace(/_/g, '-').toLowerCase()

  if (availableLangs.indexOf(defaultLang) === -1)
    return error('The default language "' + defaultLang + ' is not one of the available languages?! Available languages are: ' + availableLangs.join(', '))

  if (lang && availableLangs.indexOf(lang) === -1)
    return error('The language "' + lang + '" is not available.\nAvailable languages are ' + availableLangs.join(', ') + '.\n\nNote: the language is not case-sensitive ("en", "EN", "eN", "En" will become "en") and you can use "_" instead of "-" for seperators.')

  var data = ((appStorage && appStorage.get('lang')) || globalStorage.get('lang') || {})

  if (availableLangs.indexOf(data.selected) === -1)
    // The stored data is not available so lets use one of the other languages
    data.selected = lang || defaultLang
  else
    data.selected = lang || data.selected || defaultLang

  globalStorage.save('lang', data)
  if (appStorage)
    appStorage.save('lang', data)

  return data.selected
}

module.exports = {
  init: function(options, globalStorage, appStorage) {
    var lookup = i18nChain(
          options.appDir ? i18nFs(path.resolve(options.appDir, './i18n')) : null
        , i18nFs(path.resolve(__dirname, './i18n'))
      )
      , root = i18n(lookup)
      , choose = chooseLang.bind(null, globalStorage, appStorage, options.defaultLang, options.languages)
      , lang = choose(null)
      , translator = root.lang(lang, true)
      , result = i18n(i18nExtend(translator, {
          get: function (key) {
            if (options[key])
              return options[key]

            if (key === 'title')
              return options.name.toUpperCase()

            if (key === 'appName' || key === 'appname' || key === 'ADVENTURE_NAME')
              return options.name

            if (key === 'rootdir')
              return options.appDir

            if (key === 'COMMAND' || key === 'ADVENTURE_COMMAND')
              return commandify(options.name)

            var exercisePrefix = 'exercise.'
            if (key.indexOf(exercisePrefix) === 0)
              return key.substr(exercisePrefix.length)

            var end = key.length-UNDERLINE.length
            if (key.indexOf(UNDERLINE) === end)
              return util.repeat('\u2500', chalk.stripColor(result.__(key.substr(0, end))).length + 2)
          }
        }))
      , _exercises = []
    root.fallback = function (key) {
      return '?' + key + '?'
    }
    result.change = function (lang) {
      lang = choose(lang)
      translator.changeLang(lang)
    }
    result.extend = function (obj) {
      return i18n(i18nExtend(result, {
        get: function (key) {
          return obj[key]
        }
      }));
    }
    result.updateExercises = function(exercises) {
      _exercises = exercises;
    }
    result.lang = function () {
      return lang
    }
    return result
  }
}
