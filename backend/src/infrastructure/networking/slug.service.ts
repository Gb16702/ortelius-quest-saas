import { and, eq, ne } from 'drizzle-orm'
import { db } from '../database'
import { organization } from '../database/db/schemas/auth-schema'
import { organizationSlugAlias } from '../database/db/schemas/organization-slug-alias-schema'

// Romanization maps for Japanese
const hiraganaToRomaji: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  を: 'wo',
  ん: 'n',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  っ: '',
}

const katakanaToRomaji: Record<string, string> = {
  ア: 'a',
  イ: 'i',
  ウ: 'u',
  エ: 'e',
  オ: 'o',
  カ: 'ka',
  キ: 'ki',
  ク: 'ku',
  ケ: 'ke',
  コ: 'ko',
  サ: 'sa',
  シ: 'shi',
  ス: 'su',
  セ: 'se',
  ソ: 'so',
  タ: 'ta',
  チ: 'chi',
  ツ: 'tsu',
  テ: 'te',
  ト: 'to',
  ナ: 'na',
  ニ: 'ni',
  ヌ: 'nu',
  ネ: 'ne',
  ノ: 'no',
  ハ: 'ha',
  ヒ: 'hi',
  フ: 'fu',
  ヘ: 'he',
  ホ: 'ho',
  マ: 'ma',
  ミ: 'mi',
  ム: 'mu',
  メ: 'me',
  モ: 'mo',
  ヤ: 'ya',
  ユ: 'yu',
  ヨ: 'yo',
  ラ: 'ra',
  リ: 'ri',
  ル: 'ru',
  レ: 're',
  ロ: 'ro',
  ワ: 'wa',
  ヲ: 'wo',
  ン: 'n',
  ガ: 'ga',
  ギ: 'gi',
  グ: 'gu',
  ゲ: 'ge',
  ゴ: 'go',
  ザ: 'za',
  ジ: 'ji',
  ズ: 'zu',
  ゼ: 'ze',
  ゾ: 'zo',
  ダ: 'da',
  ヂ: 'ji',
  ヅ: 'zu',
  デ: 'de',
  ド: 'do',
  バ: 'ba',
  ビ: 'bi',
  ブ: 'bu',
  ベ: 'be',
  ボ: 'bo',
  パ: 'pa',
  ピ: 'pi',
  プ: 'pu',
  ペ: 'pe',
  ポ: 'po',
  キャ: 'kya',
  キュ: 'kyu',
  キョ: 'kyo',
  シャ: 'sha',
  シュ: 'shu',
  ショ: 'sho',
  チャ: 'cha',
  チュ: 'chu',
  チョ: 'cho',
  ニャ: 'nya',
  ニュ: 'nyu',
  ニョ: 'nyo',
  ヒャ: 'hya',
  ヒュ: 'hyu',
  ヒョ: 'hyo',
  ミャ: 'mya',
  ミュ: 'myu',
  ミョ: 'myo',
  リャ: 'rya',
  リュ: 'ryu',
  リョ: 'ryo',
  ギャ: 'gya',
  ギュ: 'gyu',
  ギョ: 'gyo',
  ジャ: 'ja',
  ジュ: 'ju',
  ジョ: 'jo',
  ビャ: 'bya',
  ビュ: 'byu',
  ビョ: 'byo',
  ピャ: 'pya',
  ピュ: 'pyu',
  ピョ: 'pyo',
  ッ: '',
  ー: '',
}

// Common kanji readings (business-related)
const kanjiToRomaji: Record<string, string> = {
  日: 'nichi',
  本: 'hon',
  東: 'to',
  京: 'kyo',
  大: 'dai',
  阪: 'saka',
  会: 'kai',
  社: 'sha',
  株: 'kabu',
  式: 'shiki',
  商: 'sho',
  事: 'ji',
  業: 'gyo',
  工: 'ko',
  産: 'san',
  物: 'butsu',
  流: 'ryu',
  通: 'tsu',
  運: 'un',
  輸: 'yu',
  送: 'so',
  貿: 'bo',
  易: 'eki',
  海: 'kai',
  空: 'ku',
  港: 'ko',
  倉: 'so',
  庫: 'ko',
  国: 'koku',
  際: 'sai',
}

// Korean Hangul to Romanization (Revised Romanization)
const koreanInitials: Record<string, string> = {
  ㄱ: 'g',
  ㄲ: 'kk',
  ㄴ: 'n',
  ㄷ: 'd',
  ㄸ: 'tt',
  ㄹ: 'r',
  ㅁ: 'm',
  ㅂ: 'b',
  ㅃ: 'pp',
  ㅅ: 's',
  ㅆ: 'ss',
  ㅇ: '',
  ㅈ: 'j',
  ㅉ: 'jj',
  ㅊ: 'ch',
  ㅋ: 'k',
  ㅌ: 't',
  ㅍ: 'p',
  ㅎ: 'h',
}

const koreanVowels: Record<string, string> = {
  ㅏ: 'a',
  ㅐ: 'ae',
  ㅑ: 'ya',
  ㅒ: 'yae',
  ㅓ: 'eo',
  ㅔ: 'e',
  ㅕ: 'yeo',
  ㅖ: 'ye',
  ㅗ: 'o',
  ㅘ: 'wa',
  ㅙ: 'wae',
  ㅚ: 'oe',
  ㅛ: 'yo',
  ㅜ: 'u',
  ㅝ: 'wo',
  ㅞ: 'we',
  ㅟ: 'wi',
  ㅠ: 'yu',
  ㅡ: 'eu',
  ㅢ: 'ui',
  ㅣ: 'i',
}

const koreanFinals: Record<string, string> = {
  '': '',
  ㄱ: 'k',
  ㄲ: 'k',
  ㄳ: 'k',
  ㄴ: 'n',
  ㄵ: 'n',
  ㄶ: 'n',
  ㄷ: 't',
  ㄹ: 'l',
  ㄺ: 'k',
  ㄻ: 'm',
  ㄼ: 'l',
  ㄽ: 'l',
  ㄾ: 'l',
  ㄿ: 'p',
  ㅀ: 'l',
  ㅁ: 'm',
  ㅂ: 'p',
  ㅄ: 'p',
  ㅅ: 't',
  ㅆ: 't',
  ㅇ: 'ng',
  ㅈ: 't',
  ㅊ: 't',
  ㅋ: 'k',
  ㅌ: 't',
  ㅍ: 'p',
  ㅎ: 't',
}

const romanizeKorean = (text: string): string => {
  const initialsList = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ]
  const vowelsList = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    'ㅘ',
    'ㅙ',
    'ㅚ',
    'ㅛ',
    'ㅜ',
    'ㅝ',
    'ㅞ',
    'ㅟ',
    'ㅠ',
    'ㅡ',
    'ㅢ',
    'ㅣ',
  ]
  const finalsList = [
    '',
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ]

  let result = ''

  for (const char of text) {
    const code = char.charCodeAt(0)

    // Check if it's a Hangul syllable (가-힣)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00
      const initialIndex = Math.floor(syllableIndex / 588)
      const vowelIndex = Math.floor((syllableIndex % 588) / 28)
      const finalIndex = syllableIndex % 28

      const initial = initialsList[initialIndex]
      const vowel = vowelsList[vowelIndex]
      const final = finalsList[finalIndex]

      result += koreanInitials[initial] + koreanVowels[vowel] + koreanFinals[final]
    } else {
      result += char
    }
  }

  return result
}

const romanizeJapanese = (text: string): string => {
  let result = text

  // Process compound characters first (2-char combinations)
  const allMaps = { ...hiraganaToRomaji, ...katakanaToRomaji }
  const compounds = Object.keys(allMaps)
    .filter((k) => k.length === 2)
    .sort((a, b) => b.length - a.length)
  for (const compound of compounds) {
    result = result.replace(new RegExp(compound, 'g'), allMaps[compound])
  }

  // Process single characters
  for (const [char, romaji] of Object.entries(hiraganaToRomaji)) {
    if (char.length === 1) result = result.replace(new RegExp(char, 'g'), romaji)
  }
  for (const [char, romaji] of Object.entries(katakanaToRomaji)) {
    if (char.length === 1) result = result.replace(new RegExp(char, 'g'), romaji)
  }
  for (const [char, romaji] of Object.entries(kanjiToRomaji)) {
    result = result.replace(new RegExp(char, 'g'), romaji)
  }

  return result
}

export const generateSlug = (companyName: string): string => {
  let result = companyName.toLowerCase().trim()

  // Romanize Asian characters
  result = romanizeKorean(result)
  result = romanizeJapanese(result)

  return (
    result
      // Normalize to NFD (decompose accents) then remove diacritical marks
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Handle special characters: đ/Đ → d
      .replace(/đ/g, 'd')
      // Remove any remaining non-alphanumeric except spaces and hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Collapse multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  )
}

export const isSlugAvailable = async (slug: string): Promise<boolean> => {
  try {
    const existingOrganization = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    if (existingOrganization.length > 0) {
      return false
    }

    const existingAlias = await db
      .select({ slug: organizationSlugAlias.slug })
      .from(organizationSlugAlias)
      .where(eq(organizationSlugAlias.slug, slug))
      .limit(1)

    return existingAlias.length === 0
  } catch (error) {
    console.error('Error checking slug availability:', error)
    return false
  }
}

export const isSlugAvailableForOrganization = async (
  slug: string,
  organizationId: string
): Promise<boolean> => {
  try {
    const existingOrganization = await db
      .select({ id: organization.id })
      .from(organization)
      .where(and(eq(organization.slug, slug), ne(organization.id, organizationId)))
      .limit(1)

    if (existingOrganization.length > 0) {
      return false
    }

    const existingAlias = await db
      .select({ organizationId: organizationSlugAlias.organizationId })
      .from(organizationSlugAlias)
      .where(
        and(
          eq(organizationSlugAlias.slug, slug),
          ne(organizationSlugAlias.organizationId, organizationId)
        )
      )
      .limit(1)

    return existingAlias.length === 0
  } catch (error) {
    console.error('Error checking slug availability:', error)
    return false
  }
}

export type SlugValidationErrorCode =
  | 'INVALID_FORMAT'
  | 'SUBDOMAIN_INVALID_LENGTH'
  | 'SUBDOMAIN_RESERVED'

export type SlugValidationResult =
  | { valid: true }
  | { valid: false; error: string; errorCode: SlugValidationErrorCode }

export const validateSlug = (slug: string): SlugValidationResult => {
  const reservedSlugs = [
    'www',
    'api',
    'admin',
    'app',
    'mail',
    'ftp',
    'blog',
    'shop',
    'store',
    'support',
    'help',
    'docs',
    'cdn',
    'assets',
    'static',
    'media',
    'uploads',
    'files',
    'dashboard',
    'panel',
    'console',
  ]

  if (!slug) {
    return { valid: false, error: 'Slug is required', errorCode: 'INVALID_FORMAT' }
  }

  if (slug.length < 3 || slug.length > 50) {
    return {
      valid: false,
      error: 'Slug must be between 3 and 50 characters',
      errorCode: 'SUBDOMAIN_INVALID_LENGTH',
    }
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return {
      valid: false,
      error:
        'Slug can only contain lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.',
      errorCode: 'INVALID_FORMAT',
    }
  }

  if (reservedSlugs.includes(slug)) {
    return {
      valid: false,
      error: 'This slug is reserved and cannot be used',
      errorCode: 'SUBDOMAIN_RESERVED',
    }
  }

  return { valid: true }
}
