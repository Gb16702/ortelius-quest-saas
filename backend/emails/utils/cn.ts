type ClassValue = string | number | boolean | undefined | null
type ClassArray = ClassValue[]
type ClassDictionary = Record<string, any>
type ClassInput = ClassValue | ClassArray | ClassDictionary

function toVal(mix: ClassInput): string {
  let str = ''

  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      for (let i = 0; i < mix.length; i++) {
        if (mix[i]) {
          const val = toVal(mix[i])
          if (val) {
            str && (str += ' ')
            str += val
          }
        }
      }
    } else {
      for (const key in mix) {
        if (mix[key]) {
          str && (str += ' ')
          str += key
        }
      }
    }
  }

  return str
}

export function cn(...inputs: ClassInput[]): string {
  let str = ''
  for (let i = 0; i < inputs.length; i++) {
    const val = toVal(inputs[i])
    if (val) {
      str && (str += ' ')
      str += val
    }
  }
  return str
}