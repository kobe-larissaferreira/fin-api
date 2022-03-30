const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

//Middleware - funcao que fica entre o request e o response

//middleware para verificar se já existe o cpf cadastrado
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "Cliente não encontrado" });
  }

  request.customer = customer;
  return next();
}
//reduce 2 parametros - acc(acumulador), operacao inicia com 0
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

//rota para criar cliente

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customersAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );
  if (customersAlreadyExists) {
    return response.status(400).json({ error: "Cliente já possui uma conta!" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  return response
    .status(201)
    .json({ message: "Cliente cadastro com sucesso" })
    .send();
});

//app.use(verifyIfExistsAccountCPF) podemos usar dessa forma quando todas as rotas abaixo dela usarem o middleware

//rota para criar o extrato do cliente
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});
//rota para fazer depósito
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statementOperation);

  return response
    .status(201)
    .json({ message: "Depósito cadastrado com sucesso" })
    .send();
});

//rota de saque
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Saldo insuficiente" });
  }
  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).json({ message: "Saque realizado" }).send();
});
//criar rota para extrato a partir da data definida
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const { date } = request.query;
  //transforma o date para pegar a data independente da hora
  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});
//atualizar dados do cliente
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  //passar o parametro cpf no header
  const { customer } = request;

  customer.name = name;

  return response
    .status(201)
    .json({ message: "Dados atualizados com sucesso" })
    .send();
});
//rota para obter dados da conta do cliente
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const indexCustomer = customers.findIndex(
    (customerIndex) => customerIndex.cpf === customer.cpf
  );
  customers.splice(indexCustomer, 1);

  return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.listen(3333, () => {
  console.log("Servidor rodando 🚀 ");
});
