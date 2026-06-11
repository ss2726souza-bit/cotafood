const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');

const app = express();

// =====================================================
// CONFIGURAÇÕES DO SISTEMA
// =====================================================
const PORT = process.env.PORT || 3001;
const APP_NAME = "CotaFood";
const APP_VERSION = "1.0.0";

// Senha do administrador (pode ser definida por variável de ambiente)
const SENHA_ADMIN = process.env.ADMIN_PASSWORD || "21912292@";

// =====================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =====================================================
const appDataPath = process.env.APPDATA ||
    (process.platform === 'darwin'
        ? path.join(process.env.HOME, 'Library', 'Preferences')
        : path.join(process.env.HOME, '.local', 'share'));

const pastaDados = path.join(appDataPath, 'CotaFood');

if (!fs.existsSync(pastaDados)) {
    fs.mkdirSync(pastaDados, { recursive: true });
}

const dbPath = path.join(pastaDados, 'distribuidora.db');
const dbOriginal = path.join(__dirname, 'distribuidora.db');

// Copia o banco inicial se não existir
if (!fs.existsSync(dbPath) && fs.existsSync(dbOriginal)) {
    console.log("Criando banco de dados inicial...");
    fs.copyFileSync(dbOriginal, dbPath);
}

console.log(`Usando banco de dados em: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao abrir banco:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
    }
});

// =====================================================
// MIDDLEWARES
// =====================================================
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ROTA PRINCIPAL
// =====================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Informações do sistema
app.get('/api/info', (req, res) => {
    res.json({
        nome: APP_NAME,
        versao: APP_VERSION,
        empresa: "CotaFood",
        status: "online"
    });
});

// =====================================================
// CRIAÇÃO DAS TABELAS
// =====================================================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        codigo TEXT PRIMARY KEY,
        descricao TEXT,
        custo REAL,
        preco1 REAL,
        preco2 REAL,
        preco3 REAL,
        preco4 REAL,
        preco5 REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cotacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER UNIQUE,
    cliente TEXT,
    vendedor TEXT,
    data TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS itens_cotacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cotacao_id INTEGER,
        codigo TEXT,
        descricao TEXT,
        custo REAL,
        fator REAL,
        preco_final REAL,
        FOREIGN KEY(cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT
    )`);

    db.run("PRAGMA foreign_keys = ON");
});

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================
function limparMoeda(valor) {
    if (!valor) return 0;
    const limpo = valor
        .toString()
        .replace('R$', '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    return parseFloat(limpo) || 0;
}

// =====================================================
// ROTAS DA API
// =====================================================

// Verificar senha do administrador
app.post('/api/admin/verificar', (req, res) => {
    const { senha } = req.body;

    if (senha === SENHA_ADMIN) {
        return res.json({ ok: true });
    }

    res.status(401).json({ ok: false, message: "Senha incorreta." });
});

// Busca de produtos (autocomplete)
app.get('/api/produtos/busca', (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 2) return res.json([]);

    const sql = `
        SELECT codigo, descricao 
        FROM produtos 
        WHERE codigo LIKE ? OR descricao LIKE ?
        LIMIT 10
    `;

    db.all(sql, [`%${termo}%`, `%${termo}%`], (err, rows) => {
        if (err) return res.json([]);
        res.json(rows);
    });
});

// Upload de planilha CSV
app.post('/api/upload', upload.single('planilha'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("DELETE FROM produtos");

                const stmt = db.prepare(`
                    INSERT INTO produtos 
                    (codigo, descricao, custo, preco1, preco2, preco3, preco4, preco5) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);

                let inseridos = 0;

                results.forEach((row) => {
                    const chaves = Object.keys(row);
                    const chaveProduto = chaves.find(k => k.toLowerCase().trim() === 'produto');
                    const textoProduto = chaveProduto ? row[chaveProduto] : '';

                    if (textoProduto) {
                        const partes = textoProduto.split(' - ');
                        const codigo = partes[0].trim();
                        const descricao = partes.slice(1).join(' - ').trim() || 'Sem descrição';

                        const chaveCusto = chaves.find(k => k.toLowerCase().includes('ult. custo'));
                        const custo = limparMoeda(row[chaveCusto]);

                        const p1 = limparMoeda(row[chaves.find(k => /preco.*0?1/i.test(k))]);
                        const p2 = limparMoeda(row[chaves.find(k => /preco.*0?2/i.test(k))]);
                        const p3 = limparMoeda(row[chaves.find(k => /preco.*0?3/i.test(k))]);
                        const p4 = limparMoeda(row[chaves.find(k => /preco.*0?4/i.test(k))]);
                        const p5 = limparMoeda(row[chaves.find(k => /preco.*0?5/i.test(k))]);

                        if (codigo) {
                            stmt.run(codigo, descricao, custo, p1, p2, p3, p4, p5);
                            inseridos++;
                        }
                    }
                });

                stmt.finalize();

                db.run("COMMIT", (err) => {
                    fs.unlinkSync(filePath);
                    if (err) {
                        return res.status(500).json({ message: "Erro ao salvar no banco." });
                    }
                    res.json({ message: `${inseridos} produtos importados com sucesso!` });
                });
            });
        });
});

// Gerar cotação
app.post('/api/cotacao', (req, res) => {
    const { codigos } = req.body;

    if (!codigos || codigos.length === 0) {
        return res.status(400).json({ error: "Nenhum código informado." });
    }

    const placeholders = codigos.map(() => '?').join(',');

    db.all(
        `SELECT * FROM produtos WHERE codigo IN (${placeholders})`,
        codigos,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Salvar cotação
app.post('/api/salvar_cotacao', (req, res) => {
    const { cliente, vendedor, itens } = req.body;
    const data = new Date().toLocaleString('pt-BR');

    if (!itens || itens.length === 0) {
        return res.status(400).json({ error: 'Nenhum item na cotação.' });
    }

    db.get("SELECT MAX(numero) AS ultimo FROM cotacoes", (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const novoNumero = (row?.ultimo || 0) + 1;

        db.run(
            `INSERT INTO cotacoes (numero, cliente, vendedor, data)
             VALUES (?, ?, ?, ?)`,
            [novoNumero, cliente, vendedor, data],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const cotacaoId = this.lastID;

                const stmt = db.prepare(`
                    INSERT INTO itens_cotacao
                    (cotacao_id, codigo, descricao, custo, fator, preco_final)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                itens.forEach(item => {
                    stmt.run(
                        cotacaoId,
                        item.codigo,
                        item.descricao,
                        item.custo,
                        item.fator,
                        item.preco_final
                    );
                });

                stmt.finalize();

                res.json({
                    message: 'Cotação salva com sucesso!',
                    numero: novoNumero
                });
            }
        );
    });
});

// Listar histórico
app.get('/api/historico', (req, res) => {
    db.all("SELECT * FROM cotacoes ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Detalhes da cotação
app.get('/api/historico/:id', (req, res) => {
    db.all(
        "SELECT * FROM itens_cotacao WHERE cotacao_id = ?",
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Excluir cotação
app.delete('/api/cotacao/:id', (req, res) => {
    db.run("DELETE FROM cotacoes WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: "Erro ao excluir cotação." });
        if (this.changes === 0) {
            return res.status(404).json({ error: "Cotação não encontrada." });
        }
        res.json({ message: "Cotação excluída com sucesso!" });
    });
});


// =====================================================
// CONFIGURAÇÕES DA EMPRESA
// =====================================================

// Buscar configurações
app.get('/api/configuracoes', (req, res) => {
    db.all("SELECT chave, valor FROM configuracoes", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const config = {
            nome: 'CotaFood',
            endereco: '',
            telefone: '',
            instagram: '',
            validade_dias: 7
        };

        rows.forEach(row => {
            if (row.chave === 'validade_dias') {
                config[row.chave] = parseInt(row.valor || '7', 10);
            } else {
                config[row.chave] = row.valor || '';
            }
        });

        res.json(config);
    });
});

// Salvar configurações
app.post('/api/configuracoes', (req, res) => {
    const {
        nome = 'CotaFood',
        endereco = '',
        telefone = '',
        instagram = '',
        validade_dias = 7
    } = req.body;

    const configuracoes = [
        ['nome', nome],
        ['endereco', endereco],
        ['telefone', telefone],
        ['instagram', instagram],
        ['validade_dias', String(validade_dias)]
    ];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const stmt = db.prepare(`
            INSERT INTO configuracoes (chave, valor)
            VALUES (?, ?)
            ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
        `);

        configuracoes.forEach(([chave, valor]) => {
            stmt.run(chave, valor);
        });

        stmt.finalize();

        db.run("COMMIT", (err) => {
            if (err) {
                return res.status(500).json({ error: "Erro ao salvar configurações." });
            }

            res.json({ message: "Configurações salvas com sucesso!" });
        });
    });
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ${APP_NAME} v${APP_VERSION} rodando em http://localhost:${PORT}`);
});