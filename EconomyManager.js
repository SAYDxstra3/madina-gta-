export class EconomyManager {
  constructor(save) {
    this.save = save;
    this.game = null;
    this.cash = 2500;
    this.bank = 5000;
    this.inventory = [];
  }

  setGame(game) { this.game = game; }

  addCash(amount) {
    this.cash += amount;
    this.game.ui.updateMoney();
    this.game.notify(`+$${amount}`);
  }

  removeCash(amount) {
    if (this.cash >= amount) {
      this.cash -= amount;
      this.game.ui.updateMoney();
      return true;
    }
    return false;
  }

  deposit(amount) {
    if (this.cash >= amount) {
      this.cash -= amount;
      this.bank += amount;
      this.game.ui.updateMoney();
      this.game.notify(`أودعت $${amount}`);
      return true;
    }
    return false;
  }

  withdraw(amount) {
    if (this.bank >= amount) {
      this.bank -= amount;
      this.cash += amount;
      this.game.ui.updateMoney();
      this.game.notify(`سحبت $${amount}`);
      return true;
    }
    return false;
  }

  buy(price) {
    return this.removeCash(price);
  }

  load(data) {
    if (data) {
      this.cash = data.cash !== undefined ? data.cash : this.cash;
      this.bank = data.bank !== undefined ? data.bank : this.bank;
      this.inventory = data.inventory || [];
    }
    this.game.ui.updateMoney();
  }
}