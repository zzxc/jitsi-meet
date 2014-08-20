/**
 * Created by hristo on 8/5/14.
 */

function Activator()
{

}

Activator.create = function(constructor)
{
    var activator = null;
    constructor.getActivator = function()
    {
        if(activator == null)
        {
            activator = Object.create(constructor.prototype);
        }
        return activator;
    }
}