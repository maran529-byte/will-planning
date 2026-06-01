package commission

import (
	"github.com/shopspring/decimal"
)

// Calculator 佣金计算器
type Calculator struct {
	level1Rate decimal.Decimal // 一级佣金比例
	level2Rate decimal.Decimal // 二级佣金比例
}

// NewCalculator 创建佣金计算器
func NewCalculator(level1Rate, level2Rate string) (*Calculator, error) {
	l1, err := decimal.NewFromString(level1Rate)
	if err != nil {
		return nil, err
	}
	l2, err := decimal.NewFromString(level2Rate)
	if err != nil {
		return nil, err
	}
	return &Calculator{level1Rate: l1, level2Rate: l2}, nil
}

// Calculate 计算佣金
func (c *Calculator) Calculate(amount float64, level int) (float64, error) {
	rate := c.level1Rate
	if level == 2 {
		rate = c.level2Rate
	}

	amountDec := decimal.NewFromFloat(amount)
	commission := amountDec.Mul(rate)

	result, err := commission.Float64()
	if err != nil {
		return 0, err
	}
	return result, nil
}

// GetRate 获取佣金比例
func (c *Calculator) GetRate(level int) decimal.Decimal {
	if level == 2 {
		return c.level2Rate
	}
	return c.level1Rate
}

// CalculateWithdrawFee 计算提现手续费
func (c *Calculator) CalculateWithdrawFee(amount float64, feeRate string) (fee, actual float64, err error) {
	rate, err := decimal.NewFromString(feeRate)
	if err != nil {
		return 0, 0, err
	}

	amountDec := decimal.NewFromFloat(amount)
	feeDec := amountDec.Mul(rate)
	actualDec := amountDec.Sub(feeDec)

	fee, err = feeDec.Float64()
	if err != nil {
		return 0, 0, err
	}
	actual, err = actualDec.Float64()
	if err != nil {
		return 0, 0, err
	}
	return fee, actual, nil
}