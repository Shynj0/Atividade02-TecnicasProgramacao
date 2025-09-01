import { createReadStream } from "fs"; // para CSV
import * as fs from "fs/promises";     // para ler HTML
import { parse } from "csv-parse";
import nodemailer from "nodemailer";

interface RegistroCSV {
    data: string;  // dd/mm/yyyy
    email: string;
    nome: string;
}

// Lê CSV e retorna array de registros
async function lerCSV(caminhoArquivo: string): Promise<RegistroCSV[]> {
    return new Promise<RegistroCSV[]>((resolve, reject) => {
        const registros: RegistroCSV[] = [];

        const leitor = createReadStream(caminhoArquivo)
            .pipe(parse({
                columns: true,
                skip_empty_lines: true,
                delimiter: ",",
                trim: true,
            }));

        leitor.on("data", (linha: RegistroCSV) => registros.push(linha));
        leitor.on("end", () => resolve(registros));
        leitor.on("error", (erro: Error) => reject(erro));
    });
}

// Classe Cliente
class Cliente {
    nome: string;
    nasc: string;
    email: string;

    constructor(nome: string, nasc: string, email: string) {
        this.nome = nome;
        this.nasc = nasc;
        this.email = email;
    }

    idade(): number {
        const hoje = new Date();
        const ano = parseInt(this.nasc.substring(6, 10));
        const mes = parseInt(this.nasc.substring(3, 5)) - 1;
        const dia = parseInt(this.nasc.substring(0, 2));
        const datan = new Date(ano, mes, dia);

        let idade: number = hoje.getFullYear() - datan.getFullYear();
        const m: number = hoje.getMonth() - datan.getMonth();

        if (m < 0 || (m === 0 && hoje.getDate() < datan.getDate())) {
            idade--;
        }
        return idade;
    }

    mesSeguinte(): string {
        const mes = parseInt(this.nasc.substring(3, 5));
        const proximo = new Date(0, mes, 1); // mês +1
        return proximo.toLocaleString("pt-BR", { month: "long" });
    }
}

// Função principal
(async () => {
    try {
        // Criar conta de teste no Ethereal
        const testAccount = await nodemailer.createTestAccount();

        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        // Lê template HTML
        const template = await fs.readFile("Mensagem.html", "utf-8");

        // Lê CSV
        const registros = await lerCSV("emails.csv");

        for (const reg of registros) {
            const cliente = new Cliente(reg.nome, reg.data, reg.email);

            // Substituir placeholders
            const mensagemPersonalizada = template
                .replace("{{nome}}", cliente.nome)
                .replace("{{percdesc}}", cliente.idade().toString())
                .replace("{{mesquevem}}", cliente.mesSeguinte());

            // Envia e-mail
            const info = await transporter.sendMail({
                from: '"Ótica Teste" <teste@example.com>',
                to: cliente.email,
                subject: "🎉 Desconto para aniversariante!",
                text: mensagemPersonalizada,
                html: mensagemPersonalizada,
            });

            console.log(`E-mail enviado para ${cliente.nome} (${cliente.email})`);
            console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
            console.log("--------------------------------------------------");
        }
    } catch (error) {
        console.error("Erro ao enviar:", error);
    }
})();
