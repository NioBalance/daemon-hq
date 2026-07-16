// "Resta connesso": la sessione vive in localStorage (sopravvive a riavvii
// del browser/PWA) se il flag è attivo, altrimenti in sessionStorage (sparisce
// alla chiusura). Il flag stesso vive sempre in localStorage per essere letto
// prima ancora che una sessione esista.
const REMEMBER_KEY = 'daemon:remember'

export function getRemember(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== '0'
}

export function setRemember(value: boolean) {
  localStorage.setItem(REMEMBER_KEY, value ? '1' : '0')
}

export const authStorage = {
  getItem(key: string) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    if (getRemember()) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}
