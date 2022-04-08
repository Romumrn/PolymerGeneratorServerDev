
source $polyplyenv


cp input/json.inp monjson.json
ITPOUT="polymere.itp"
GROOUT="out.gro"

polyply gen_params -lib $ff -o $ITPOUT -seqf monjson.json -name $name > polyply.out 2> polyply.err

[ -f $ITPOUT ] && cat $ITPOUT
echo "STOP"
[ -f polyply.err ] && cat polyply.err
