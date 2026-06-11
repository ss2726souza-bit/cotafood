let configEmpresa = {
    nome: 'CotaFood',
    endereco: 'Av. Quatorze de Dezembro, 2846 - Vila Rami, Jundiaí - SP',
    telefone: '(11) 2152-6600',
    instagram: '@ferperezalimentos | @ferperezburger',
    validade_dias: 7
};

let numeroCotacaoAtual = null;
let debounceTimer = null;

function mostrarSecao(secaoId, botao = null) {
    document.querySelectorAll('.secao').forEach(secao => {
        secao.classList.remove('ativa');
    });

    const secao = document.getElementById(secaoId);
    if (secao) secao.classList.add('ativa');

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    if (botao) botao.classList.add('active');

    if (secaoId === 'historico') carregarHistorico();
    if (secaoId === 'dashboard') carregarDashboard();
    if (secaoId === 'admin') carregarConfiguracoesEmpresa();

    if (window.lucide) lucide.createIcons();
}

async function carregarDashboard() {
    try {
        const resHistorico = await fetch('/api/historico');
        const historico = await resHistorico.json();

        const totalCotacoes = Array.isArray(historico) ? historico.length : 0;
        const clientesUnicos = Array.isArray(historico)
            ? new Set(historico.map(item => (item.cliente || '').trim()).filter(Boolean)).size
            : 0;

        const elCotacoes = document.getElementById('totalCotacoes');
        const elClientes = document.getElementById('totalClientes');
        const elStatus = document.getElementById('statusSistema');

        if (elCotacoes) elCotacoes.innerText = totalCotacoes;
        if (elClientes) elClientes.innerText = clientesUnicos;
        if (elStatus) elStatus.innerText = 'Online';
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

async function buscarProdutos() {
    const input = document.getElementById('codigosInput');
    const tbody = document.querySelector('#tabelaCotacao tbody');

    if (!input || !tbody) return;

    const texto = input.value.trim();
    if (!texto) {
        alert('Digite os códigos dos produtos.');
        return;
    }

    const codigos = texto
        .split(/[\n,; ]+/)
        .map(codigo => codigo.trim())
        .filter(Boolean);

    try {
        const res = await fetch('/api/cotacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigos })
        });

        if (!res.ok) throw new Error('Erro ao buscar produtos.');

        const produtos = await res.json();
        tbody.innerHTML = '';

        if (!Array.isArray(produtos) || produtos.length === 0) {
            alert('Nenhum produto encontrado.');
            return;
        }

        produtos.forEach(produto => adicionarLinhaProduto(produto, tbody));
    } catch (error) {
        console.error(error);
        alert('Erro ao gerar cotação.');
    }
}

function adicionarLinhaProduto(produto, tbody) {
    const custo = Number(produto.custo || 0);
    const fatorPadrao = parseFloat(document.getElementById('globalFator')?.value || '1.5') || 1.5;
    const precoFinal = custo * fatorPadrao;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="td-cod"><strong>${produto.codigo || ''}</strong></td>
        <td class="td-desc">${produto.descricao || ''}</td>
        <td class="coluna-privada td-custo" data-custo="${custo}">R$ ${custo.toFixed(2)}</td>
        <td class="coluna-privada">${formatarPreco(produto.preco1)}</td>
        <td class="coluna-privada">${formatarPreco(produto.preco2)}</td>
        <td class="coluna-privada">${formatarPreco(produto.preco3)}</td>
        <td class="coluna-privada">${formatarPreco(produto.preco4)}</td>
        <td class="coluna-privada">${formatarPreco(produto.preco5)}</td>
        <td class="coluna-privada">
            <input
                type="number"
                class="fator-input"
                step="0.01"
                min="0"
                value="${fatorPadrao.toFixed(2)}"
                oninput="atualizarPorFator(this, ${custo})"
            >
        </td>
        <td>
            <input
                type="number"
                class="preco-final-input"
                step="0.01"
                min="0"
                value="${precoFinal.toFixed(2)}"
                oninput="atualizarPorPreco(this, ${custo})"
            >
        </td>
        <td class="coluna-privada">
            <button class="btn-excluir-linha" onclick="removerLinha(this)" title="Remover">×</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function formatarPreco(valor) {
    const numero = Number(valor || 0);
    return numero > 0 ? numero.toFixed(2) : '-';
}

function atualizarPorFator(input, custo) {
    const fator = parseFloat(input.value);
    const linha = input.closest('tr');
    const precoInput = linha.querySelector('.preco-final-input');

    if (!isNaN(fator) && custo > 0) {
        precoInput.value = (custo * fator).toFixed(2);
    }
}

function atualizarPorPreco(input, custo) {
    const preco = parseFloat(input.value);
    const linha = input.closest('tr');
    const fatorInput = linha.querySelector('.fator-input');

    if (!isNaN(preco) && custo > 0) {
        fatorInput.value = (preco / custo).toFixed(2);
    }
}

function aplicarGlobal() {
    const valor = parseFloat(document.getElementById('globalFator')?.value);

    if (isNaN(valor) || valor <= 0) {
        alert('Informe uma margem/fator válido.');
        return;
    }

    document.querySelectorAll('.fator-input').forEach(input => {
        const custo = parseFloat(input.closest('tr').querySelector('.td-custo').dataset.custo || '0');
        input.value = valor.toFixed(2);
        atualizarPorFator(input, custo);
    });
}

function removerLinha(botao) {
    const tr = botao.closest('tr');
    if (tr) tr.remove();
}

function limparTudo() {
    const nomeCliente = document.getElementById('nomeClienteInput');
    const nomeVendedor = document.getElementById('nomeVendedorInput');
    const codigosInput = document.getElementById('codigosInput');
    const inputBusca = document.getElementById('inputBuscaProduto');
    const validadeInput = document.getElementById('validadeCotacaoInput');
    const tbody = document.querySelector('#tabelaCotacao tbody');

    if (nomeCliente) nomeCliente.value = '';
    if (nomeVendedor) nomeVendedor.value = '';
    if (codigosInput) codigosInput.value = '';
    if (inputBusca) inputBusca.value = '';
    if (validadeInput) validadeInput.value = configEmpresa.validade_dias || 7;
    if (tbody) tbody.innerHTML = '';

    numeroCotacaoAtual = null;
    esconderBusca();
}

async function salvarCotacao() {
    const cliente = document.getElementById('nomeClienteInput')?.value.trim() || 'Cliente Não Informado';
    const vendedor = document.getElementById('nomeVendedorInput')?.value.trim() || 'Não Informado';
    const linhas = document.querySelectorAll('#tabelaCotacao tbody tr');

    if (!linhas.length) {
        alert('Não há itens para salvar.');
        return;
    }

    const itens = [];

    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        const codigo = colunas[0]?.innerText?.trim() || '';
        const descricao = colunas[1]?.innerText?.trim() || '';
        const custo = parseFloat(linha.querySelector('.td-custo')?.dataset?.custo || '0');
        const fator = parseFloat(linha.querySelector('.fator-input')?.value || '0');
        const precoFinal = parseFloat(linha.querySelector('.preco-final-input')?.value || '0');

        itens.push({
            codigo,
            descricao,
            custo,
            fator,
            preco_final: precoFinal
        });
    });

    try {
        const res = await fetch('/api/salvar_cotacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente, vendedor, itens })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');

        numeroCotacaoAtual = data.numero || null;
        alert(`Cotação Nº ${String(data.numero || 0).padStart(6, '0')} salva com sucesso!`);
        carregarDashboard();
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar cotação.');
    }
}

async function carregarHistorico() {
    const listaHistorico = document.getElementById('listaHistorico');
    if (!listaHistorico) return;

    listaHistorico.innerHTML = '<p class="subtitulo">Carregando...</p>';

    try {
        const res = await fetch('/api/historico');
        const historico = await res.json();

        if (!Array.isArray(historico) || historico.length === 0) {
            listaHistorico.innerHTML = '<p class="subtitulo">Nenhuma cotação salva ainda.</p>';
            return;
        }

        listaHistorico.innerHTML = historico.map(item => `
            <div class="hist-card">
                <div class="hist-topo">
                    <div class="hist-info">
                        <div><strong>Cotação Nº:</strong> ${String(item.numero || item.id).padStart(6, '0')}</div>
                        <div><strong>Cliente:</strong> ${item.cliente || '-'}</div>
                        <div><strong>Vendedor:</strong> ${item.vendedor || '-'}</div>
                        <div><strong>Data:</strong> ${item.data || '-'}</div>
                    </div>

                    <div class="hist-acoes">
                        <button class="btn-primary" onclick="verDetalhesHistorico(${item.id})">Ver Itens</button>
                        <button class="btn-secondary" onclick="excluirCotacao(${item.id})">Excluir</button>
                    </div>
                </div>

                <div class="hist-detalhes" id="detalhes-${item.id}"></div>
            </div>
        `).join('');
    } catch (error) {
        console.error(error);
        listaHistorico.innerHTML = '<p class="subtitulo">Erro ao carregar histórico.</p>';
    }
}

async function verDetalhesHistorico(id) {
    const container = document.getElementById(`detalhes-${id}`);
    if (!container) return;

    if (container.dataset.aberto === 'true') {
        container.innerHTML = '';
        container.dataset.aberto = 'false';
        return;
    }

    container.innerHTML = '<p class="subtitulo">Carregando itens...</p>';

    try {
        const res = await fetch(`/api/historico/${id}`);
        const itens = await res.json();

        if (!Array.isArray(itens) || itens.length === 0) {
            container.innerHTML = '<p class="subtitulo">Nenhum item encontrado.</p>';
            container.dataset.aberto = 'true';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>CÓDIGO</th>
                        <th>DESCRIÇÃO</th>
                        <th>CUSTO</th>
                        <th>FATOR</th>
                        <th>PREÇO FINAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${itens.map(item => `
                        <tr>
                            <td>${item.codigo || ''}</td>
                            <td>${item.descricao || ''}</td>
                            <td>R$ ${Number(item.custo || 0).toFixed(2)}</td>
                            <td>${Number(item.fator || 0).toFixed(2)}</td>
                            <td>R$ ${Number(item.preco_final || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.dataset.aberto = 'true';
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="subtitulo">Erro ao carregar detalhes.</p>';
    }
}

async function excluirCotacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta cotação?')) return;

    try {
        const res = await fetch(`/api/cotacao/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');

        alert(data.message || 'Cotação excluída com sucesso!');
        carregarHistorico();
        carregarDashboard();
    } catch (error) {
        console.error(error);
        alert('Erro ao excluir cotação.');
    }
}

async function verificarSenha() {
    const inputSenha = document.getElementById('inputSenhaAdmin');
    const msgSenha = document.getElementById('msgSenha');
    const adminArquivoWrap = document.getElementById('adminArquivoWrap');

    const senha = inputSenha.value.trim();

    if (!senha) {
        msgSenha.innerText = 'Digite a senha.';
        msgSenha.style.color = 'red';
        return;
    }

    try {
        const res = await fetch('/api/admin/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha })
        });

        const data = await res.json();

        if (data.ok) {
            msgSenha.innerText = '✅ Acesso liberado.';
            msgSenha.style.color = 'green';
            adminArquivoWrap.style.display = 'block';
        } else {
            msgSenha.innerText = '❌ Senha incorreta.';
            msgSenha.style.color = 'red';
            adminArquivoWrap.style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        msgSenha.innerText = 'Erro ao verificar senha.';
        msgSenha.style.color = 'red';
    }
}

async function uploadPlanilha() {
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files.length) {
        alert('Selecione um arquivo CSV.');
        return;
    }

    const formData = new FormData();
    formData.append('planilha', fileInput.files[0]);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Erro no upload.');

        alert(data.message || 'Upload realizado com sucesso!');
        fileInput.value = '';
    } catch (error) {
        console.error(error);
        alert('Erro ao importar CSV.');
    }
}

function prepararCabecalhoImpressao() {
    const cliente = document.getElementById('nomeClienteInput')?.value.trim() || '-';
    const vendedor = document.getElementById('nomeVendedorInput')?.value.trim() || '-';
    const data = new Date().toLocaleString('pt-BR');

    const inputValidade = document.getElementById('validadeCotacaoInput');
    let validadeDias = parseInt(inputValidade?.value, 10);

    if (isNaN(validadeDias) || validadeDias <= 0) {
        validadeDias = configEmpresa.validade_dias || 7;
    }

    const validade = `${validadeDias} dia${validadeDias > 1 ? 's' : ''}`;

    const elCliente = document.getElementById('printCliente');
    const elVendedor = document.getElementById('printVendedor');
    const elData = document.getElementById('printData');
    const elValidade = document.getElementById('printValidade');
    const elNumero = document.getElementById('printNumero');
    const elNome = document.getElementById('printEmpresaNome');
    const elEndereco = document.getElementById('printEmpresaEndereco');
    const elTelefone = document.getElementById('printEmpresaTelefone');
    const elInstagram = document.getElementById('printEmpresaInstagram');

    if (elCliente) elCliente.innerText = cliente;
    if (elVendedor) elVendedor.innerText = vendedor;
    if (elData) elData.innerText = data;
    if (elValidade) elValidade.innerText = validade;
    if (elNumero) {
        elNumero.innerText = numeroCotacaoAtual
            ? String(numeroCotacaoAtual).padStart(6, '0')
            : '------';
    }

    if (elNome) elNome.innerText = configEmpresa.nome || 'CotaFood';
    if (elEndereco) elEndereco.innerText = configEmpresa.endereco || '';
    if (elTelefone) elTelefone.innerText = configEmpresa.telefone || '';
    if (elInstagram) elInstagram.innerText = configEmpresa.instagram || '';

    const header = document.getElementById('printHeader');
    if (header) header.classList.add('ativo');
}

function finalizarCabecalhoImpressao() {
    const header = document.getElementById('printHeader');
    if (header) header.classList.remove('ativo');
}

function ocultarColunasPrivadas() {
    document.querySelectorAll('.coluna-privada').forEach(el => {
        el.dataset.displayOriginal = el.style.display || '';
        el.style.display = 'none';
    });
}

function restaurarColunasPrivadas() {
    document.querySelectorAll('.coluna-privada').forEach(el => {
        el.style.display = el.dataset.displayOriginal || '';
    });
}

function exportarPDF() {
    const area = document.getElementById('areaCotacao');
    const nomeCliente = document.getElementById('nomeClienteInput')?.value.trim() || 'cotacao';

    if (!area || !area.querySelector('tbody tr')) {
        alert('Não há cotação para exportar.');
        return;
    }

    prepararCabecalhoImpressao();
    ocultarColunasPrivadas();

    html2canvas(area, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 8;
        const usableWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (imgHeight <= pageHeight - margin * 2) {
            doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
        } else {
            let alturaRestante = imgHeight;
            let posicaoY = 0;

            doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
            alturaRestante -= (pageHeight - margin * 2);

            while (alturaRestante > 0) {
                posicaoY -= (pageHeight - margin * 2);
                doc.addPage();
                doc.addImage(imgData, 'PNG', margin, margin + posicaoY, usableWidth, imgHeight);
                alturaRestante -= (pageHeight - margin * 2);
            }
        }

        doc.save(`Cotacao_${nomeCliente.replace(/\s+/g, '_')}.pdf`);
        restaurarColunasPrivadas();
        finalizarCabecalhoImpressao();
    }).catch(error => {
        console.error(error);
        restaurarColunasPrivadas();
        finalizarCabecalhoImpressao();
        alert('Erro ao exportar PDF.');
    });
}

function exportarImagem() {
    const area = document.getElementById('areaCotacao');
    const nomeCliente = document.getElementById('nomeClienteInput')?.value.trim() || 'cotacao';

    if (!area || !area.querySelector('tbody tr')) {
        alert('Não há cotação para exportar.');
        return;
    }

    prepararCabecalhoImpressao();
    ocultarColunasPrivadas();

    html2canvas(area, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Cotacao_${nomeCliente.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        restaurarColunasPrivadas();
        finalizarCabecalhoImpressao();
    }).catch(error => {
        console.error(error);
        restaurarColunasPrivadas();
        finalizarCabecalhoImpressao();
        alert('Erro ao exportar imagem.');
    });
}

async function carregarConfiguracoesEmpresa() {
    try {
        const res = await fetch('/api/configuracoes');
        if (!res.ok) return;

        const data = await res.json();
        configEmpresa = { ...configEmpresa, ...data };

        const nome = document.getElementById('empresaNome');
        const endereco = document.getElementById('empresaEndereco');
        const telefone = document.getElementById('empresaTelefone');
        const instagram = document.getElementById('empresaInstagram');
        const validade = document.getElementById('empresaValidade');
        const validadeCotacaoInput = document.getElementById('validadeCotacaoInput');

        if (nome) nome.value = configEmpresa.nome || '';
        if (endereco) endereco.value = configEmpresa.endereco || '';
        if (telefone) telefone.value = configEmpresa.telefone || '';
        if (instagram) instagram.value = configEmpresa.instagram || '';
        if (validade) validade.value = configEmpresa.validade_dias || 7;
        if (validadeCotacaoInput) validadeCotacaoInput.value = configEmpresa.validade_dias || 7;
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

async function salvarConfiguracoesEmpresa() {
    const payload = {
        nome: document.getElementById('empresaNome')?.value.trim() || 'CotaFood',
        endereco: document.getElementById('empresaEndereco')?.value.trim() || '',
        telefone: document.getElementById('empresaTelefone')?.value.trim() || '',
        instagram: document.getElementById('empresaInstagram')?.value.trim() || '',
        validade_dias: parseInt(document.getElementById('empresaValidade')?.value || '7', 10)
    };

    try {
        const res = await fetch('/api/configuracoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações.');

        configEmpresa = { ...configEmpresa, ...payload };

        const validadeCotacaoInput = document.getElementById('validadeCotacaoInput');
        if (validadeCotacaoInput) validadeCotacaoInput.value = configEmpresa.validade_dias || 7;

        alert(data.message || 'Configurações salvas com sucesso!');
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar configurações da empresa.');
    }
}

function adicionarItemCompra() {
    const produto = document.getElementById('compraProdutoInput')?.value.trim() || '';
    const marca = document.getElementById('compraMarcaInput')?.value.trim() || '';
    const quantidade = document.getElementById('compraQuantidadeInput')?.value.trim() || '';
    const unidade = document.getElementById('compraUnidadeInput')?.value.trim() || '';
    const gramatura = document.getElementById('compraGramaturaInput')?.value.trim() || '';
    const observacao = document.getElementById('compraObsItemInput')?.value.trim() || '';
    const similar = document.getElementById('compraSimilarInput')?.value || 'Sim';

    if (!produto) {
        alert('Informe o produto.');
        return;
    }

    const tbody = document.querySelector('#tabelaCompra tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${produto}</td>
        <td>${marca || '-'}</td>
        <td>${quantidade || '-'}</td>
        <td>${unidade || '-'}</td>
        <td>${gramatura || '-'}</td>
        <td>${observacao || '-'}</td>
        <td>${similar}</td>
        <td class="coluna-compra-acao">
            <button class="btn-excluir-linha" onclick="removerLinhaCompra(this)" title="Remover">×</button>
        </td>
    `;

    tbody.appendChild(tr);
}

function limparCamposItemCompra() {
    const campos = [
        'compraProdutoInput',
        'compraMarcaInput',
        'compraQuantidadeInput',
        'compraUnidadeInput',
        'compraGramaturaInput',
        'compraObsItemInput'
    ];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const similar = document.getElementById('compraSimilarInput');
    if (similar) similar.value = 'Sim';
}

function removerLinhaCompra(botao) {
    const tr = botao.closest('tr');
    if (tr) tr.remove();
}

function limparCotacaoCompra() {
    const campos = [
        'compraFornecedorInput',
        'compraSolicitanteInput',
        'compraObservacoesGerais'
    ];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const prazo = document.getElementById('compraPrazoInput');
    if (prazo) prazo.value = 2;

    const tbody = document.querySelector('#tabelaCompra tbody');
    if (tbody) tbody.innerHTML = '';

    limparCamposItemCompra();
}

function prepararCabecalhoCompra() {
    const fornecedor = document.getElementById('compraFornecedorInput')?.value.trim() || '-';
    const solicitante = document.getElementById('compraSolicitanteInput')?.value.trim() || '-';
    const prazoDias = parseInt(document.getElementById('compraPrazoInput')?.value || '2', 10);
    const observacoes = document.getElementById('compraObservacoesGerais')?.value.trim() || 'Solicitamos, por gentileza, o envio da sua melhor cotação para os itens abaixo.';
    const data = new Date().toLocaleString('pt-BR');

    const prazoTexto = `${prazoDias > 0 ? prazoDias : 2} dia${(prazoDias > 1 ? 's' : '')}`;

    const elNome = document.getElementById('printCompraEmpresaNome');
    const elEndereco = document.getElementById('printCompraEmpresaEndereco');
    const elTelefone = document.getElementById('printCompraEmpresaTelefone');
    const elInstagram = document.getElementById('printCompraEmpresaInstagram');
    const elFornecedor = document.getElementById('printCompraFornecedor');
    const elSolicitante = document.getElementById('printCompraSolicitante');
    const elData = document.getElementById('printCompraData');
    const elPrazo = document.getElementById('printCompraPrazo');
    const elObs = document.getElementById('printCompraObservacoes');

    if (elNome) elNome.innerText = configEmpresa.nome || 'CotaFood';
    if (elEndereco) elEndereco.innerText = configEmpresa.endereco || '';
    if (elTelefone) elTelefone.innerText = configEmpresa.telefone || '';
    if (elInstagram) elInstagram.innerText = configEmpresa.instagram || '';

    if (elFornecedor) elFornecedor.innerText = fornecedor;
    if (elSolicitante) elSolicitante.innerText = solicitante;
    if (elData) elData.innerText = data;
    if (elPrazo) elPrazo.innerText = prazoTexto;
    if (elObs) elObs.innerText = observacoes;

    const header = document.getElementById('printHeaderCompra');
    if (header) header.classList.add('ativo');
}

function finalizarCabecalhoCompra() {
    const header = document.getElementById('printHeaderCompra');
    if (header) header.classList.remove('ativo');
}

function ocultarAcoesCompra() {
    document.querySelectorAll('.coluna-compra-acao').forEach(el => {
        el.dataset.displayOriginal = el.style.display || '';
        el.style.display = 'none';
    });
}

function restaurarAcoesCompra() {
    document.querySelectorAll('.coluna-compra-acao').forEach(el => {
        el.style.display = el.dataset.displayOriginal || '';
    });
}

function exportarPDFCompra() {
    const area = document.getElementById('areaCompra');
    const fornecedor = document.getElementById('compraFornecedorInput')?.value.trim() || 'fornecedor';

    if (!area || !area.querySelector('tbody tr')) {
        alert('Não há itens na cotação de compra.');
        return;
    }

    prepararCabecalhoCompra();
    ocultarAcoesCompra();

    html2canvas(area, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 8;
        const usableWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (imgHeight <= pageHeight - margin * 2) {
            doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
        } else {
            let alturaRestante = imgHeight;
            let posicaoY = 0;

            doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
            alturaRestante -= (pageHeight - margin * 2);

            while (alturaRestante > 0) {
                posicaoY -= (pageHeight - margin * 2);
                doc.addPage();
                doc.addImage(imgData, 'PNG', margin, margin + posicaoY, usableWidth, imgHeight);
                alturaRestante -= (pageHeight - margin * 2);
            }
        }

        doc.save(`Cotacao_Compra_${fornecedor.replace(/\s+/g, '_')}.pdf`);
        restaurarAcoesCompra();
        finalizarCabecalhoCompra();
    }).catch(error => {
        console.error(error);
        restaurarAcoesCompra();
        finalizarCabecalhoCompra();
        alert('Erro ao exportar PDF da cotação de compra.');
    });
}

function exportarImagemCompra() {
    const area = document.getElementById('areaCompra');
    const fornecedor = document.getElementById('compraFornecedorInput')?.value.trim() || 'fornecedor';

    if (!area || !area.querySelector('tbody tr')) {
        alert('Não há itens na cotação de compra.');
        return;
    }

    prepararCabecalhoCompra();
    ocultarAcoesCompra();

    html2canvas(area, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Cotacao_Compra_${fornecedor.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        restaurarAcoesCompra();
        finalizarCabecalhoCompra();
    }).catch(error => {
        console.error(error);
        restaurarAcoesCompra();
        finalizarCabecalhoCompra();
        alert('Erro ao exportar imagem da cotação de compra.');
    });
}

function exportarExcelCompra() {
    const fornecedor = document.getElementById('compraFornecedorInput')?.value.trim() || '';
    const solicitante = document.getElementById('compraSolicitanteInput')?.value.trim() || '';
    const prazoDias = parseInt(document.getElementById('compraPrazoInput')?.value || '2', 10);
    const observacoes = document.getElementById('compraObservacoesGerais')?.value.trim() || '';
    const tbody = document.querySelector('#tabelaCompra tbody');

    if (!tbody || !tbody.querySelector('tr')) {
        alert('Não há itens na cotação de compra.');
        return;
    }

    const prazoTexto = `${prazoDias > 0 ? prazoDias : 2} dia${prazoDias > 1 ? 's' : ''}`;
    const dataGeracao = new Date().toLocaleString('pt-BR');

    const linhas = Array.from(tbody.querySelectorAll('tr'));

    const dadosItens = linhas.map(linha => {
        const colunas = linha.querySelectorAll('td');

        return {
            'Produto': colunas[0]?.innerText?.trim() || '',
            'Marca desejada': colunas[1]?.innerText?.trim() || '',
            'Quantidade': colunas[2]?.innerText?.trim() || '',
            'Unidade': colunas[3]?.innerText?.trim() || '',
            'Gramatura': colunas[4]?.innerText?.trim() || '',
            'Observações do item': colunas[5]?.innerText?.trim() || '',
            'Aceita similar?': colunas[6]?.innerText?.trim() || '',
            'Preço cotado': '',
            'Marca ofertada': '',
            'Prazo de entrega': '',
            'Observação do fornecedor': ''
        };
    });

    const wb = XLSX.utils.book_new();

    const dadosCabecalho = [
        ['CotaFood - Solicitação de Cotação'],
        [''],
        ['Empresa', configEmpresa.nome || 'CotaFood'],
        ['Fornecedor', fornecedor || '-'],
        ['Solicitante', solicitante || '-'],
        ['Data de geração', dataGeracao],
        ['Prazo para resposta', prazoTexto],
        ['Observações gerais', observacoes || '-'],
        ['']
    ];

    const wsCabecalho = XLSX.utils.aoa_to_sheet(dadosCabecalho);
    wsCabecalho['!cols'] = [
        { wch: 22 },
        { wch: 60 }
    ];

    const wsItens = XLSX.utils.json_to_sheet(dadosItens);
    wsItens['!cols'] = [
        { wch: 28 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 28 },
        { wch: 16 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 28 }
    ];

    XLSX.utils.book_append_sheet(wb, wsCabecalho, 'Resumo');
    XLSX.utils.book_append_sheet(wb, wsItens, 'Itens');

    const nomeArquivoBase = fornecedor
        ? `Cotacao_Compra_${fornecedor.replace(/\s+/g, '_')}`
        : 'Cotacao_Compra';

    XLSX.writeFile(wb, `${nomeArquivoBase}.xlsx`);
}

function esconderBusca() {
    const listaBusca = document.getElementById('lista-busca');
    if (listaBusca) {
        listaBusca.style.display = 'none';
        listaBusca.innerHTML = '';
    }
}

function adicionarCodigo(codigo) {
    const areaCodigos = document.getElementById('codigosInput');
    const inputBusca = document.getElementById('inputBuscaProduto');

    if (!areaCodigos) return;

    const atual = areaCodigos.value.trim();
    areaCodigos.value = atual ? `${atual}\n${codigo}` : codigo;

    if (inputBusca) inputBusca.value = '';
    esconderBusca();
    areaCodigos.focus();
}

function iniciarAutocomplete() {
    const inputBusca = document.getElementById('inputBuscaProduto');
    const listaBusca = document.getElementById('lista-busca');

    if (!inputBusca || !listaBusca) return;

    inputBusca.addEventListener('input', function () {
        const termo = this.value.trim();
        clearTimeout(debounceTimer);

        if (termo.length < 2) {
            esconderBusca();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/produtos/busca?q=${encodeURIComponent(termo)}`);
                const produtos = await res.json();

                listaBusca.innerHTML = '';

                if (!Array.isArray(produtos) || produtos.length === 0) {
                    esconderBusca();
                    return;
                }

                produtos.forEach(produto => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${produto.codigo}</strong> - ${produto.descricao}`;
                    li.onclick = () => adicionarCodigo(produto.codigo);
                    listaBusca.appendChild(li);
                });

                listaBusca.style.display = 'block';
            } catch (error) {
                console.error('Erro na busca:', error);
                esconderBusca();
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        const inputBuscaLocal = document.getElementById('inputBuscaProduto');
        const listaBuscaLocal = document.getElementById('lista-busca');

        if (!inputBuscaLocal || !listaBuscaLocal) return;

        if (!inputBuscaLocal.contains(e.target) && !listaBuscaLocal.contains(e.target)) {
            esconderBusca();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDashboard();
    carregarConfiguracoesEmpresa();
    iniciarAutocomplete();

    const inputSenha = document.getElementById('inputSenhaAdmin');
    if (inputSenha) {
        inputSenha.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
    }

    if (window.lucide) {
        lucide.createIcons();
    }
});