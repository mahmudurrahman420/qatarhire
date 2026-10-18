import { test } from '@japa/runner'
import { skillSlug } from '#models/skill'
import { detectCvType, detectImageType } from '#services/file_validation'
import { likeTerm } from '#services/search_helpers'

test.group('Skill slugs', () => {
  test('symbol-heavy skills stay distinct', ({ assert }) => {
    const slugs = ['C', 'C#', 'C++', '.NET', 'Node.js'].map(skillSlug)
    assert.equal(new Set(slugs).size, slugs.length)
  })
})

test.group('File content detection', () => {
  test('recognises PDFs and DOCX by content, not name', ({ assert }) => {
    assert.equal(detectCvType(Buffer.from('%PDF-1.7 ...')), 'pdf')
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....word/document.xml')])
    assert.equal(detectCvType(docx), 'docx')
    assert.isNull(detectCvType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])), 'a plain zip is not a CV')
    assert.isNull(detectCvType(Buffer.from('MZ\x90\x00 executable')))
  })

  test('recognises images', ({ assert }) => {
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpg')
    assert.isNull(detectImageType(Buffer.from('<svg onload=alert(1)>')), 'SVG is not accepted')
  })
})

test.group('Search helpers', () => {
  test('escapes LIKE wildcards', ({ assert }) => {
    assert.equal(likeTerm('50%_off!'), '%50!%!_off!!%')
  })
})
