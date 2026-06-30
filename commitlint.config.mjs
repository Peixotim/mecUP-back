/**
 * Commitlint — padrão Conventional Commits.
 * Formato: <type>(<scope>): <subject>
 * Ex.: feat(auth): adiciona login com refresh token
 *
 * @see https://www.conventionalcommits.org
 * @type {import('@commitlint/types').UserConfig}
 */

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nova funcionalidade
        'fix', // correção de bug
        'docs', // apenas documentação
        'style', // formatação, sem mudança de lógica
        'refactor', // refatoração sem alterar comportamento
        'perf', // melhoria de performance
        'test', // adiciona/ajusta testes
        'build', // build, dependências
        'ci', // pipelines/CI
        'chore', // tarefas diversas
        'revert', // reverte um commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
}
