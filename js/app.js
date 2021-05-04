import {
  mulan_abi,
  mulan2_abi,
  mulan_stake_abi,
  timelocks_abi,
  mulan_address,
  mulan2_address,
  mulan_stake_address,
  timelocks_address
} from "./abi_address.js";




window.onload = async () => {
  window.app = {};
  window.app.update = {}
  $("#network").click(async () => {
    await start()
  })
  await start()
}



function showMsg(strCN, strEN) {
  let str = ""
  if ($("#lang").val() == "cn") {
    str = strCN
  } else {
    str = strEN
  }
  if (typeof imtoken == 'undefined') {
    alert(str)
  } else {
    imToken.callAPI('native.alert', str)
  }
}

function jumpToEtherscan(address) {
  showMsg("正在前往 etherscan", "redirecting to etherscan")
  setTimeout(() => {
    window.location = 'https://cn.etherscan.com/address/' + address + '#transactions'
  }, 2000)
}


async function start() {
  // Modern dApp browsers...
  if (window.ethereum) {
    $("#broswer_type").html("modern")
    window.web3 = new Web3("https://mainnet.infura.io/v3/d64d364124684359ace20feae1f9ac20")
    try {
      // await ethereum.enable()
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });
    } catch (error) {
      showMsg(error, error)
    }
  }
  // Legacy dApp browsers...
  else if (window.web3) {
    $("#broswer_type").html("Legacy")
    window.web3 = new Web3(web3.currentProvider)
  }
  // Non-dApp browsers...
  else {
    $("#broswer_type").html("none")
    showMsg("请链接 Metamask", "Please connect to Metamask.")
  }

  window.mulan = new web3.eth.Contract(mulan_abi, mulan_address)
  window.mulan2 = new web3.eth.Contract(mulan2_abi, mulan2_address)
  window.mulan_stake = new web3.eth.Contract(mulan_stake_abi, mulan_stake_address);
  window.timelocks = new web3.eth.Contract(timelocks_abi, timelocks_address);




let prod_data = await getAllProducts(window.mulan_stake, "0x2F3B65fD3f5b4Efa1ccb258757aCc504aFd67F20")
$("#product_sales").html(prod_data[0].prodName)

let lock_data = await getUserLocks(window.timelocks, "0x2F3B65fD3f5b4Efa1ccb258757aCc504aFd67F20")
$("#log_show").html(lock_data[0].locked)

}

export const getAllProducts = async (mulan_stake) => {
  let num = await mulan_stake.methods.getProductCount().call()
  if (num == 0){
      return []
  }
  let promises = []
  for (let i = 0; i < num; i++) {
      promises.push(mulan_stake.methods.products(i).call())
  }
  let products = await Promise.all(promises)
  return products
}

export const getProductSales = async (mulan_stake) => {
  let num = await mulan_stake.methods.getProductCount().call()
  if (num == 0){
      return []
  }
  let promises = []
  for (let i = 0; i < num; i++) {
      promises.push(mulan_stake.methods.sales(i).call())
  }
  let sales = await Promise.all(promises)
  return sales
}

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

const  logTransform = (log) => {
  let values = log.returnValues;
  return {
      locked: (values.value / 10**18).toFixed(4),
      reward: (values.reward/ 10**18).toFixed(4),
      startTime:  values.startTime * 1000,
      releaseTime: values.releaseTime * 1000,
      APY: Math.round(values.reward / values.value * (YEAR_IN_SECONDS / (values.releaseTime - values.startTime))*10000) / 10000 * 100 + "%",
      released: false
  }
}

const logReleaseTransform = (log) => {
  let values = log.returnValues;
  let num = []
  return values.lockNumber
}

export const getUserLocks = async (timelocks, account) => {
  try {
      let log = await timelocks.getPastEvents("LockCreated", { fromBlock: 0, toBlock: "latest", filter: { "user": account } })
      let log_released = await timelocks.getPastEvents("Released", { fromBlock: 0, toBlock: "latest", filter: { "user": account } })


      if (log.length == 0) {
          return []
      }
      let log_data =  log.map(x => logTransform(x));
      let released = log_released.map(x => logReleaseTransform(x));

      for(let i in log_data){
          if(released.includes(i)){
              log_data[i].released = true;
          }
      }
      return log_data

  } catch (e) {
      console.log(e)
      return []
  }
}

export const deposit = async (mulan_stake, product_id, amount, account, tokenName) => {
  const gas = GAS_LIMIT.STAKING[tokenName.toUpperCase()] || GAS_LIMIT.STAKING.DEFAULT;
  return mulan_stake.methods.deposit(product_id, (new BigNumber(amount).times(new BigNumber(10).pow(18))).toString())
      .send({ from: account, gas })
      .on('transactionHash', tx => {
          //console.log(tx)
          return tx.transactionHash
      })
}

export const withdraw = async (mulan_stake, lockNumber, account, tokenName) => {
  const gas = GAS_LIMIT.STAKING[tokenName.toUpperCase()] || GAS_LIMIT.STAKING.DEFAULT;
  return mulan_stake.methods.withdraw(lockNumber)
      .send({ from: account, gas })
      .on('transactionHash', tx => {
          //console.log(tx)
          return tx.transactionHash
      })
}





window.getAllProducts = getAllProducts
window.getProductSales = getProductSales
window.getUserLocks = getUserLocks
window.deposit = deposit
window.withdraw = withdraw
